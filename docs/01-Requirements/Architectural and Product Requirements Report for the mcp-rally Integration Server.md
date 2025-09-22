

# **Architectural and Product Requirements Report for the mcp-rally Integration Server**

## **1\. Executive Summary**

This report provides a detailed analysis of the technical architecture and product requirements for mcp-rally, a new service designed to function as a Model Context Protocol (MCP) server for the Rally Web Services API (WSAPI). The central objective is to empower artificial intelligence (AI) systems, particularly large language models (LLMs), to securely and efficiently interact with Rally's project management platform. By creating a standardized set of MCP tools and resources that abstract the complexities of Rally’s RESTful API, this solution effectively addresses the common problem of creating custom connectors for disparate data sources, often referred to as the "N×M" data integration problem.1 This integration will significantly enhance the utility and automation capabilities of AI agents in the context of the software development lifecycle. The following sections provide a foundational analysis of both the Rally WSAPI and the MCP, detail the proposed architectural blueprint, specify the functional requirements in a Product Requirements Document (PRD), and conclude with an actionable implementation roadmap and strategic recommendations for future development.

## **2\. Foundational Analysis: Understanding the Protocols**

### **2.1. Rally WSAPI: A Deep Dive into its Ecosystem**

The Rally WSAPI is a robust interface for programmatic access to Rally's project management and application lifecycle management data. It operates on a structured object model containing a variety of key artifacts, including core work items such as User Stories, Defects, and Tasks.2 The API also manages other essential entities like Portfolio Items, Releases, Projects, and Users, each with a specific set of fields and defined relationships.2 A Rally field can be a simple string, but it also has the capacity to encapsulate complex data types, custom conversion logic, and a mapping property to precisely extract values from raw data objects.4

The API provides a comprehensive set of operations, including standard CRUD (create, get, update, delete) and a powerful query function.5 These operations are executed via request-specific objects, such as

CreateRequest or QueryRequest. The querying mechanism is particularly sophisticated, allowing for the construction of complex logical expressions with operators like \[:and \[:or...\]\].6 Furthermore, queries can be precisely scoped by

workspace and project, with options to traverse project hierarchies both up and down, which is essential for enabling robust and context-aware search capabilities for an LLM.3

Authentication for the WSAPI is primarily managed through API keys, which are the recommended and more secure alternative to traditional username/password credentials.5 As a best practice for API hygiene, Rally advises including specific HTTP headers, such as

X-RallyIntegrationName and X-RallyIntegrationVendor, on all requests.5 The

mcp-rally server will be designed to incorporate these headers to ensure proper integration and traceability.

An interesting characteristic of the Rally platform is the apparent duality in its architectural design. While toolkits for languages like Clojure and Java present the API as a standard, synchronous REST interface 5, the client-side documentation reveals its foundation on an event-driven framework, specifically

Ext.util.Observable.4 This indicates that the Rally WSAPI is engineered to be consumed by both synchronous, server-side applications and asynchronous, event-driven client-side components. The design of the

mcp-rally server will account for this by focusing on the synchronous REST model, which is a more natural fit for the JSON-RPC transport used by MCP. By doing so, the server will act as a crucial abstraction layer, shielding the LLM from the underlying platform's complexities and event-driven architecture. This ensures the LLM interacts with a clean, consistent, and predictable interface.

### **2.2. Model Context Protocol (MCP): The Framework for AI-Tool Interaction**

The Model Context Protocol (MCP) is a recently introduced, open standard designed to standardize how LLMs communicate with external systems.1 It was created to solve the problem of information silos by providing a universal interface for AI systems to read data, execute functions, and handle contextual prompts.1 This framework significantly increases the potential for AI automation by allowing LLMs to access real-time, external data sources and business software, thereby reducing the risk of generating inaccurate or fabricated information, a phenomenon known as "hallucination".7

The protocol defines three core components that collaborate to enable AI-tool interaction: the **MCP Host**, which contains the LLM (e.g., an AI-powered IDE); the **MCP Client**, located within the host to facilitate communication and translate requests; and the **MCP Server**, which is the external service wrapper (mcp-rally will fulfill this role).7 This secure, bidirectional communication is primarily transported via JSON-RPC 2.0 messages over two standard methods:

stdio for local, fast synchronous operations, and Server-Sent Events (SSE) for remote, efficient real-time data streaming.7

The conceptual model of MCP represents a paradigm shift from traditional REST APIs. Rather than relying on stateless HTTP requests, MCP defines "tools" for state-changing actions (e.g., creating a record) and "resources" for read-only data retrieval.9 This structured approach enables sophisticated "tool use" by AI agents, allowing them to perform actions in the real world and interact with external systems in a reliable and predictable manner.7

## **3\. Architectural Design & Integration Strategy**

### **3.1. The mcp-rally Server: An Architectural Blueprint**

The mcp-rally server will be constructed based on two proven software engineering patterns to ensure its design is both robust and scalable. The first is the **Facade Pattern**, which provides a simplified, high-level interface to a complex subsystem.10 Instead of exposing the numerous and intricate endpoints of the Rally WSAPI,

mcp-rally will offer a curated set of high-level tools, such as create\_user\_story or query\_defects. This approach significantly reduces the complexity for the LLM and the client, making the integration much easier to manage.

The second pattern is the **Bridge Pattern**, a structural design pattern that separates a system into two hierarchies: abstraction and implementation.11 In this context, the MCP tools will serve as the abstraction layer, while the Rally WSAPI will be the implementation. This decoupling allows the core logic of the

mcp-rally server to be developed independently of the specific Rally API version or its underlying implementation details. For example, the create\_user\_story tool's interface can remain stable even if the Rally API changes, with the server's internal logic handling the translation to the new API.

The mcp-rally server can be understood as a specialized instance of an **API Microgateway**.12 While a microgateway typically serves a single microservice, this server acts as a dedicated gateway for a specific legacy API, Rally. This design provides similar benefits, including giving a single service control over its traffic, security, and the ability to scale and be maintained independently from other components in the broader AI ecosystem. This focused approach simplifies management and enhances security by providing a singular, controlled entry point to the Rally platform.

### **3.2. Mapping Rally WSAPI to MCP Tools & Resources**

The conversion from Rally's REST API to a structured MCP server is a multi-step process.9 Rally's state-changing endpoints, such as

create, update, and delete, will be mapped to MCP tools. In contrast, read-only endpoints like get and query will be exposed as MCP resources.

A critical aspect of this conversion is the flattening of API parameters.9 Rally's API can distribute parameters across the URL path, query string, and request body. Each MCP tool, however, requires a single, unified input schema that combines all these parameters into a simple structure for the LLM to consume.

Furthermore, a data model translation layer is required to provide a more idiomatic and accessible data representation to the LLM. The Rally WSAPI uses CamelCase for its field names (e.g., CurrentProjectName) and prefixes custom fields with c\_ (e.g., c\_MyCustomField), while metadata fields begin with an underscore (\_ref).6 A simple, direct mapping of these names to the MCP interface would be unnatural for an LLM to reason about and inconsistent with modern API design principles. By implementing a translation layer similar to that found in other Rally toolkits,

mcp-rally can convert CamelCase to kebab-case and use namespaces or prefixes to disambiguate field types.6 This transformation is essential for usability and is a core part of the server's value proposition. The following tables formalize the proposed mappings.

**Table 1: API Mapping of Rally WSAPI to MCP Tools/Resources**

| MCP Tool/Resource Name | Rally Artifact Type | Rally WSAPI Endpoint | HTTP Method | Description |
| :---- | :---- | :---- | :---- | :---- |
| mcp-rally.create\_user\_story | UserStory | /slm/webservice/v2.0/UserStory/create | POST | Creates a new User Story. |
| mcp-rally.get\_user\_story | UserStory | /slm/webservice/v2.0/UserStory/{ObjectID} | GET | Retrieves a single User Story. |
| mcp-rally.update\_user\_story | UserStory | /slm/webservice/v2.0/UserStory/{ObjectID} | POST | Modifies an existing User Story. |
| mcp-rally.query\_user\_stories | UserStory | /slm/webservice/v2.0/UserStory | GET | Searches for User Stories. |
| mcp-rally.create\_defect | Defect | /slm/webservice/v2.0/Defect/create | POST | Creates a new Defect. |
| mcp-rally.query\_defects | Defect | /slm/webservice/v2.0/Defect | GET | Searches for Defects. |
| mcp-rally.create\_task | Task | /slm/webservice/v2.0/Task/create | POST | Creates a new Task. |
| mcp-rally.update\_task | Task | /slm/webservice/v2.0/Task/{ObjectID} | POST | Updates an existing Task. |
| mcp-rally.query\_all\_artifacts | Dynamic | /slm/webservice/v2.0/{ArtifactType} | GET | Generalized search for any artifact type. |

**Table 2: Data Model Translation Rules**

| Rally Field Name (CamelCase) | MCP Field Name (kebab-case) | Type |
| :---- | :---- | :---- |
| CurrentProjectName | current-project-name | Built-in |
| c\_MyCustomField | custom-my-custom-field | Custom |
| \_ref | metadata-ref | Metadata |
| \_refObjectName | metadata-ref-object-name | Metadata |
| \_type | metadata-type | Metadata |

### **3.3. Security, Authentication, and Scalability**

Security is a paramount concern for this integration. The mcp-rally server will rely on environment variables to securely store the Rally API Key, preventing the hard-coding of credentials within the codebase.13 This method is a standard practice for secure application development. All outgoing requests to the Rally WSAPI will be encrypted via HTTPS and will include the required integration headers (

X-RallyIntegrationName, etc.) as a best practice.5 For future-proofing, the server will be designed with the capability to verify HMAC signatures, a security mechanism mentioned in Rally's connector documentation for ensuring the authenticity and integrity of incoming requests.14

The server's design prioritizes scalability. By adopting a stateless architecture, particularly when using the Streamable HTTP transport, mcp-rally can be deployed in serverless or containerized environments.9 This approach allows the service to handle high-load tasks, such as those that might trigger thousands of events at once, in a highly scalable manner.14

## **4\. mcp-rally Product Requirements Document (PRD)**

### **4.1. Functional Requirements**

This section defines the minimum viable product (MVP) requirements for the mcp-rally server, organized by Rally artifact type.

* **User Stories (UserStory)**  
  * mcp-rally.create\_user\_story: A tool to create a new User Story with specified fields such as Name, Description, and Project.  
  * mcp-rally.get\_user\_story: A resource to retrieve a single User Story by its unique identifier.  
  * mcp-rally.update\_user\_story: A tool to modify existing fields on a User Story.  
  * mcp-rally.query\_user\_stories: A tool to search and retrieve a list of User Stories based on a structured query that supports advanced filtering.2  
* **Defects (Defect)**  
  * mcp-rally.create\_defect: A tool to create a new Defect with fields like Severity, State, and Owner.  
  * mcp-rally.query\_defects: A tool to search for Defects by criteria such as state or owner.  
  * mcp-rally.update\_defect\_state: A simplified tool to change a Defect's state (e.g., from Open to In-Progress).  
* **Tasks (Task)**  
  * mcp-rally.create\_task: A tool to create a new Task, with the option to link it to a parent User Story or Defect.  
  * mcp-rally.update\_task: A tool to update an existing Task.  
* **General Querying**  
  * mcp-rally.query\_all\_artifacts: A powerful, generalized tool that accepts an artifact type and a structured query to search for any supported artifact, providing a comprehensive way for the LLM to access data across the platform.

### **4.2. API Specifications and Data Model**

The API specifications for mcp-rally will be formally defined using JSON Schema for each tool and resource. This will serve as the central reference for both the client and server implementations. The schemas will define the required and optional input parameters and the expected output structures, with all field names adhering to the kebab-case naming convention and type-based prefixes as defined in the data model translation table (Table 2). The API mapping table (Table 1\) will function as a central reference, explicitly mapping each MCP tool/resource name to its corresponding Rally WSAPI endpoint, HTTP method, and a brief description of the action.

### **4.3. Non-Functional Requirements**

* **Performance**: The server must provide low-latency responses by leveraging an asynchronous HTTP client.5 This is crucial for enabling smooth, real-time interactions with the LLM.  
* **Security**: All communication will be secured via HTTPS, and the server will be designed to use environment variables for all sensitive information.13  
* **Transport Support**: The server will support both stdio and SSE transport layers.7 The former is ideal for local development and debugging, while the latter is necessary for robust, remote, and real-time production deployments.  
* **Reliability & Error Handling**: Robust error handling will be implemented to translate Rally WSAPI error codes and messages into a consistent, machine-readable format for the MCP client. This includes detailed logging to aid in debugging and maintenance.

## **5\. Implementation and Rollout Plan**

The implementation will follow a phased approach to ensure a stable and reliable final product. **Phase 1 (MVP)** will focus on building the core architectural foundation, including the Facade and Bridge patterns, by implementing the full set of functional requirements for a single artifact type, such as the User Story. This phase will validate the core design and the data model translation layer. **Phase 2 (Full-Featured Server)** will expand support to other key artifact types, including Defects and Tasks, and complete the implementation of the full range of functional requirements outlined in the PRD. **Phase 3 (Production Hardening)** will concentrate on non-functional requirements, including comprehensive error handling, enhanced logging, and the full implementation of security best practices. The technology stack will be based on TypeScript, utilizing the official @modelcontextprotocol/sdk.1 This SDK provides classes like

McpServer and StdioServerTransport for building a compliant server.16 It also leverages libraries like Zod for defining and validating the JSON schemas of tools and resources, ensuring a type-safe and robust API surface.15 For the Streamable HTTP transport layer, a modern web framework like Express will be used to handle requests and responses.17

## **6\. Conclusion and Future Recommendations**

The mcp-rally server will be a transformative tool for bridging the gap between Rally's robust project management capabilities and the emerging landscape of AI-driven automation. By providing a clean, consistent, and secure interface, it unlocks new opportunities for automating complex workflows, generating real-time project status summaries, and enabling advanced reasoning across distributed data sources.

Looking toward the future, the mcp-rally server's potential extends beyond its initial design as a command-and-control bridge. The Rally documentation mentions a "Hooks" mechanism, a unique bidirectional system where the Rally API (publisher) can request data from a subscribed URL (the mcp-rally server as the subscriber).14 This is a departure from the traditional client-server model and presents a unique opportunity when combined with the MCP's support for real-time, stream-based communication via SSE.7 A future iteration of

mcp-rally could evolve into a bidirectional event hub. Instead of an LLM only reacting to user prompts by calling Rally, the server could also act as a "hook" endpoint, receiving notifications from Rally when specific events occur (e.g., a new Defect is created or a User Story's state changes). mcp-rally could then forward this event as an update stream to the MCP Host, enabling proactive, event-driven AI workflows. For example, an AI agent could be configured to automatically trigger an alert or a follow-up action when a high-priority defect is created in Rally, without requiring a manual user query. This capability would enable a higher level of automation and represents a significant long-term strategic advantage for the platform.

#### **Works cited**

1. Model Context Protocol \- Wikipedia, accessed September 20, 2025, [https://en.wikipedia.org/wiki/Model\_Context\_Protocol](https://en.wikipedia.org/wiki/Model_Context_Protocol)  
2. Rally Web Services API \- Broadcom Tech Docs \- Broadcom Inc., accessed September 20, 2025, [https://techdocs.broadcom.com/us/en/ca-enterprise-software/valueops/rally/rally-help/reference/rally-web-services-api.html](https://techdocs.broadcom.com/us/en/ca-enterprise-software/valueops/rally/rally-help/reference/rally-web-services-api.html)  
3. Rally.data.wsapi.artifact.Store \- Agile Central App SDK 2.1 Docs, accessed September 20, 2025, [https://rally1.rallydev.com/docs/en-us/saas/apps/2.1/doc/index.html\#\!/api/Rally.data.wsapi.artifact.Store](https://rally1.rallydev.com/docs/en-us/saas/apps/2.1/doc/index.html#!/api/Rally.data.wsapi.artifact.Store)  
4. Rally.data.wsapi.Model \- Agile Central App SDK 2.1 Docs, accessed September 20, 2025, [https://rally1.rallydev.com/docs/en-us/saas/apps/2.1/doc/index.html\#\!/api/Rally.data.wsapi.Model](https://rally1.rallydev.com/docs/en-us/saas/apps/2.1/doc/index.html#!/api/Rally.data.wsapi.Model)  
5. RallyRestApi (Rally Rest Toolkit For Java 2.2.1 API) \- GitHub Pages, accessed September 20, 2025, [https://rallytools.github.io/RallyRestToolkitForJava/com/rallydev/rest/RallyRestApi.html](https://rallytools.github.io/RallyRestToolkitForJava/com/rallydev/rest/RallyRestApi.html)  
6. RallyTools/RallyRestAPIForClojure: Access the Rally Rest API from Clojure \- GitHub, accessed September 20, 2025, [https://github.com/RallyTools/RallyRestAPIForClojure](https://github.com/RallyTools/RallyRestAPIForClojure)  
7. What is Model Context Protocol (MCP)? A guide | Google Cloud, accessed September 20, 2025, [https://cloud.google.com/discover/what-is-model-context-protocol](https://cloud.google.com/discover/what-is-model-context-protocol)  
8. mcp \- Model Context Protocol \- LiteLLM Docs, accessed September 20, 2025, [https://docs.litellm.ai/docs/mcp](https://docs.litellm.ai/docs/mcp)  
9. From REST API to MCP Server \- Stainless MCP Portal, accessed September 20, 2025, [https://www.stainless.com/mcp/from-rest-api-to-mcp-server](https://www.stainless.com/mcp/from-rest-api-to-mcp-server)  
10. The Facade Pattern in Modern JavaScript: Simplifying Complex Systems \- Medium, accessed September 20, 2025, [https://medium.com/@artemkhrenov/the-facade-pattern-in-modern-javascript-simplifying-complex-systems-df4de098529b](https://medium.com/@artemkhrenov/the-facade-pattern-in-modern-javascript-simplifying-complex-systems-df4de098529b)  
11. Bridge \- Refactoring.Guru, accessed September 20, 2025, [https://refactoring.guru/design-patterns/bridge](https://refactoring.guru/design-patterns/bridge)  
12. API Gateway Pattern: 5 Design Options and How to Choose \- Solo.io, accessed September 20, 2025, [https://www.solo.io/topics/api-gateway/api-gateway-pattern](https://www.solo.io/topics/api-gateway/api-gateway-pattern)  
13. dkmaker/mcp-rest-api: A TypeScript-based MCP server that ... \- GitHub, accessed September 20, 2025, [https://github.com/dkmaker/mcp-rest-api](https://github.com/dkmaker/mcp-rest-api)  
14. Rally API docs, accessed September 20, 2025, [https://api-docs.rallyon.com/](https://api-docs.rallyon.com/)  
15. What is the Model Context Protocol ? How to Use It with TypeScript ? | Medium, accessed September 20, 2025, [https://medium.com/@halilxibrahim/simplifying-ai-integration-with-mcp-a-guide-for-typescript-developers-c6f2b93c1b56](https://medium.com/@halilxibrahim/simplifying-ai-integration-with-mcp-a-guide-for-typescript-developers-c6f2b93c1b56)  
16. Writing an MCP Server with Typescript | by Doğukan Akkaya \- Medium, accessed September 20, 2025, [https://medium.com/@dogukanakkaya/writing-an-mcp-server-with-typescript-b1caf1b2caf1](https://medium.com/@dogukanakkaya/writing-an-mcp-server-with-typescript-b1caf1b2caf1)  
17. A Guide to Build MCP Server using Typescript | by Mithilesh Tarkar | Sep, 2025, accessed September 20, 2025, [https://javascript.plainenglish.io/a-guide-to-build-mcp-server-using-typescript-7e6fe7724cf7?source=rss----4b3a1ed4f11c---4](https://javascript.plainenglish.io/a-guide-to-build-mcp-server-using-typescript-7e6fe7724cf7?source=rss----4b3a1ed4f11c---4)  
18. Model Context Protocol: TypeScript SDKs for the Agentic AI ecosystem \- Speakeasy, accessed September 20, 2025, [https://www.speakeasy.com/blog/release-model-context-protocol](https://www.speakeasy.com/blog/release-model-context-protocol)