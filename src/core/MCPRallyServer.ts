/**
 * Main MCP Rally Server Implementation
 *
 * Central server class that coordinates all components.
 * Implements the main IMCPServer interface and MCP protocol handlers.
 *
 * Requirements: ADR-002 (MCP Server Core Structure), ADR-010 (Component Integration)
 */

import {
  IMCPServer,
  ITransportLayer,
  IRallyClient,
  IDataTransformer,
  ISecurityManager,
  IPerformanceManager,
  IAdvancedQueryEngine,
  MCPError,
  MCPErrorType
} from './interfaces';
import { StdioTransport } from '../transport/StdioTransport';
import { SSETransport } from '../transport/SSETransport';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  ObjectIdSchema,
  UserStoryCreateSchema,
  UserStoryUpdateSchema,
  UserStoryQuerySchema,
  DefectCreateSchema,
  DefectUpdateSchema,
  DefectQuerySchema,
  DefectStateUpdateSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskQuerySchema,
  QueryAllArtifactsSchema
} from '../schemas';

export class MCPRallyServer implements IMCPServer {
  constructor(
    private transportLayer: ITransportLayer,
    private rallyClient: IRallyClient,
    private dataTransformer: IDataTransformer,
    private securityManager: ISecurityManager,
    private performanceManager: IPerformanceManager,
    private queryEngine?: IAdvancedQueryEngine
  ) {}

  async initialize(): Promise<void> {
    try {
      // Validate environment configuration
      this.securityManager.validateEnvironment();

      // Validate security configuration
      await this.securityManager.validateApiKey();

      // Initialize Rally client with authentication
      const apiKey = process.env['RALLY_API_KEY'];
      if (!apiKey) {
        throw new Error('RALLY_API_KEY environment variable is required');
      }
      await this.rallyClient.authenticate(apiKey);

      // Set up MCP tool handlers
      this.setupToolHandlers();

      // Start transport layer
      await this.transportLayer.start();

      // Only log to stderr in stdio mode to avoid interfering with MCP protocol
      if (process.env['RALLY_TRANSPORT'] !== 'stdio') {
        console.log('MCP Rally server initialized successfully');
      } else {
        console.error('MCP Rally server initialized successfully');
      }
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Try to get message property or convert to JSON
        errorMessage = (error as any).message || JSON.stringify(error, null, 2);
      } else {
        errorMessage = String(error);
      }

      console.error('MCPRallyServer initialization failed:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        rallyBaseUrl: process.env['RALLY_BASE_URL'] || 'https://rally1.rallydev.com',
        hasApiKey: !!process.env['RALLY_API_KEY']
      });
      throw new Error(`Failed to initialize MCP Rally server: ${errorMessage}`);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.transportLayer.stop();
      // Only log to stderr in stdio mode to avoid interfering with MCP protocol
      if (process.env['RALLY_TRANSPORT'] !== 'stdio') {
        console.log('MCP Rally server shutdown completed');
      } else {
        console.error('MCP Rally server shutdown completed');
      }
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Setup MCP tool handlers for Rally operations
   */
  private setupToolHandlers(): void {
    // Only setup handlers for StdioTransport (SSE handles its own)
    if (this.transportLayer instanceof StdioTransport) {
      const server = this.transportLayer.getServer();

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const startTime = Date.now();

        try {
          let result;

          switch (name) {
            case 'get_user_story':
              result = await this.handleGetUserStory(args as { objectId: string });
              break;

            case 'create_user_story':
              result = await this.handleCreateUserStory(args as any);
              break;

            case 'update_user_story':
              result = await this.handleUpdateUserStory(args as any);
              break;

            case 'query_user_stories':
              result = await this.handleQueryUserStories(args as any);
              break;

            case 'get_defect':
              result = await this.handleGetDefect(args as { objectId: string });
              break;

            case 'create_defect':
              result = await this.handleCreateDefect(args as any);
              break;

            case 'update_defect':
              result = await this.handleUpdateDefect(args as any);
              break;

            case 'query_defects':
              result = await this.handleQueryDefects(args as any);
              break;

            case 'update_defect_state':
              result = await this.handleUpdateDefectState(args as any);
              break;

            case 'get_task':
              result = await this.handleGetTask(args as { objectId: string });
              break;

            case 'create_task':
              result = await this.handleCreateTask(args as any);
              break;

            case 'update_task':
              result = await this.handleUpdateTask(args as any);
              break;

            case 'query_tasks':
              result = await this.handleQueryTasks(args as any);
              break;

            case 'query_all_artifacts':
              result = await this.handleQueryAllArtifacts(args as any);
              break;

            default:
              throw new Error(`Unknown tool: ${name}`);
          }

          // Track performance metrics
          const duration = Date.now() - startTime;
          this.performanceManager.trackRequestMetrics(name, duration, true);

          return result;
        } catch (error) {
          // Track error metrics
          const duration = Date.now() - startTime;
          this.performanceManager.trackRequestMetrics(name, duration, false);

          // Convert error to MCP format
          const mcpError = this.handleToolError(error, name);

          return {
            content: [
              {
                type: 'text',
                text: `Error executing ${name}: ${mcpError.message}`
              }
            ],
            isError: true
          };
        }
      });
    }
  }

  /**
   * Handle get_user_story tool
   */
  private async handleGetUserStory(args: { objectId: string }) {
    // Validate input
    const validatedArgs = ObjectIdSchema.parse(args);
    try {
      const response = await this.rallyClient.get('UserStory', args.objectId);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const userStory = response.QueryResult.Results[0];
      if (!userStory) {
        throw new Error(`User Story with ID ${args.objectId} not found`);
      }

      // Transform Rally data to MCP format
      const transformedStory = this.dataTransformer.rallyToMcp(userStory);

      return {
        content: [
          {
            type: 'text',
            text: `User Story Retrieved:\n${JSON.stringify(transformedStory, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'get_user_story');
    }
  }

  /**
   * Handle create_user_story tool
   */
  private async handleCreateUserStory(args: any) {
    // Validate input
    const validatedArgs = UserStoryCreateSchema.parse(args);
    try {
      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(args);

      const response = await this.rallyClient.create('UserStory', rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const createdStory = response.QueryResult.Results[0];
      const transformedStory = this.dataTransformer.rallyToMcp(createdStory);

      return {
        content: [
          {
            type: 'text',
            text: `User Story Created Successfully:\n${JSON.stringify(transformedStory, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'create_user_story');
    }
  }

  /**
   * Handle update_user_story tool
   */
  private async handleUpdateUserStory(args: any) {
    // Validate input
    const validatedArgs = UserStoryUpdateSchema.extend({ objectId: ObjectIdSchema.shape.objectId }).parse(args);
    try {
      const { objectId, ...updateData } = args;

      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(updateData);

      const response = await this.rallyClient.update('UserStory', objectId, rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const updatedStory = response.QueryResult.Results[0];
      const transformedStory = this.dataTransformer.rallyToMcp(updatedStory);

      return {
        content: [
          {
            type: 'text',
            text: `User Story Updated Successfully:\n${JSON.stringify(transformedStory, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'update_user_story');
    }
  }

  /**
   * Handle query_user_stories tool
   */
  private async handleQueryUserStories(args: any) {
    // Validate input
    const validatedArgs = UserStoryQuerySchema.parse(args);
    try {
      // Build Rally query from MCP parameters
      const rallyQuery = this.buildRallyQuery(args);

      const response = await this.rallyClient.query('UserStory', rallyQuery);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      // Transform Rally data to MCP format
      const transformedStories = response.QueryResult.Results.map(story =>
        this.dataTransformer.rallyToMcp(story)
      );

      return {
        content: [
          {
            type: 'text',
            text: `Found ${transformedStories.length} User Stories:\n${JSON.stringify(transformedStories, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'query_user_stories');
    }
  }

  /**
   * Handle get_defect tool
   */
  private async handleGetDefect(args: { objectId: string }) {
    // Validate input
    const validatedArgs = ObjectIdSchema.parse(args);
    try {
      const response = await this.rallyClient.get('Defect', args.objectId);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const defect = response.QueryResult.Results[0];
      if (!defect) {
        throw new Error(`Defect with ID ${args.objectId} not found`);
      }

      // Transform Rally data to MCP format
      const transformedDefect = this.dataTransformer.rallyToMcp(defect);

      return {
        content: [
          {
            type: 'text',
            text: `Defect Retrieved:\n${JSON.stringify(transformedDefect, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'get_defect');
    }
  }

  /**
   * Handle create_defect tool
   */
  private async handleCreateDefect(args: any) {
    // Validate input
    const validatedArgs = DefectCreateSchema.parse(args);
    try {
      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(args);

      const response = await this.rallyClient.create('Defect', rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const createdDefect = response.QueryResult.Results[0];
      const transformedDefect = this.dataTransformer.rallyToMcp(createdDefect);

      return {
        content: [
          {
            type: 'text',
            text: `Defect Created Successfully:\n${JSON.stringify(transformedDefect, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'create_defect');
    }
  }

  /**
   * Handle update_defect tool
   */
  private async handleUpdateDefect(args: any) {
    // Validate input
    const validatedArgs = DefectUpdateSchema.extend({ objectId: ObjectIdSchema.shape.objectId }).parse(args);
    try {
      const { objectId, ...updateData } = args;

      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(updateData);

      const response = await this.rallyClient.update('Defect', objectId, rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const updatedDefect = response.QueryResult.Results[0];
      const transformedDefect = this.dataTransformer.rallyToMcp(updatedDefect);

      return {
        content: [
          {
            type: 'text',
            text: `Defect Updated Successfully:\n${JSON.stringify(transformedDefect, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'update_defect');
    }
  }

  /**
   * Handle query_defects tool
   */
  private async handleQueryDefects(args: any) {
    // Validate input
    const validatedArgs = DefectQuerySchema.parse(args);
    try {
      // Build Rally query from MCP parameters
      const rallyQuery = this.buildRallyQueryForDefects(args);

      const response = await this.rallyClient.query('Defect', rallyQuery);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      // Transform Rally data to MCP format
      const transformedDefects = response.QueryResult.Results.map(defect =>
        this.dataTransformer.rallyToMcp(defect)
      );

      return {
        content: [
          {
            type: 'text',
            text: `Found ${transformedDefects.length} Defects:\n${JSON.stringify(transformedDefects, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'query_defects');
    }
  }

  /**
   * Handle update_defect_state tool - specialized state change tool
   */
  private async handleUpdateDefectState(args: any) {
    // Validate input
    const validatedArgs = DefectStateUpdateSchema.parse(args);
    try {
      const { objectId, state, resolution, fixedInBuild, ...additionalData } = args;

      // Build state change data
      const stateData: any = { State: state };

      if (resolution) {
        stateData.Resolution = resolution;
      }

      if (fixedInBuild) {
        stateData.FixedInBuild = fixedInBuild;
      }

      // Include any additional fields provided
      Object.assign(stateData, additionalData);

      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(stateData);

      const response = await this.rallyClient.update('Defect', objectId, rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const updatedDefect = response.QueryResult.Results[0];
      const transformedDefect = this.dataTransformer.rallyToMcp(updatedDefect);

      return {
        content: [
          {
            type: 'text',
            text: `Defect State Updated Successfully:\n${JSON.stringify(transformedDefect, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'update_defect_state');
    }
  }

  /**
   * Handle get_task tool
   */
  private async handleGetTask(args: { objectId: string }) {
    // Validate input
    const validatedArgs = ObjectIdSchema.parse(args);
    try {
      const response = await this.rallyClient.get('Task', args.objectId);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const task = response.QueryResult.Results[0];
      if (!task) {
        throw new Error(`Task with ID ${args.objectId} not found`);
      }

      // Transform Rally data to MCP format
      const transformedTask = this.dataTransformer.rallyToMcp(task);

      return {
        content: [
          {
            type: 'text',
            text: `Task Retrieved:\n${JSON.stringify(transformedTask, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'get_task');
    }
  }

  /**
   * Handle create_task tool with enhanced parent linking
   */
  private async handleCreateTask(args: any) {
    // Validate input
    const validatedArgs = TaskCreateSchema.parse(args);
    try {
      // Handle parent linking for User Stories or Defects
      const rallyData = this.dataTransformer.mcpToRally(args);

      // If parent is specified, validate and link
      if (args.parent || args['parent-user-story'] || args['parent-defect']) {
        const parentRef = args.parent || args['parent-user-story'] || args['parent-defect'];

        // Determine parent type and validate existence
        if (args['parent-user-story']) {
          rallyData.WorkProduct = parentRef;
        } else if (args['parent-defect']) {
          rallyData.WorkProduct = parentRef;
        } else if (args.parent) {
          // Generic parent - try to determine type
          rallyData.WorkProduct = parentRef;
        }
      }

      const response = await this.rallyClient.create('Task', rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const createdTask = response.QueryResult.Results[0];
      const transformedTask = this.dataTransformer.rallyToMcp(createdTask);

      return {
        content: [
          {
            type: 'text',
            text: `Task Created Successfully:\n${JSON.stringify(transformedTask, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'create_task');
    }
  }

  /**
   * Handle update_task tool
   */
  private async handleUpdateTask(args: any) {
    // Validate input
    const validatedArgs = TaskUpdateSchema.extend({ objectId: ObjectIdSchema.shape.objectId }).parse(args);
    try {
      const { objectId, ...updateData } = args;

      // Transform MCP data to Rally format
      const rallyData = this.dataTransformer.mcpToRally(updateData);

      const response = await this.rallyClient.update('Task', objectId, rallyData);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      const updatedTask = response.QueryResult.Results[0];
      const transformedTask = this.dataTransformer.rallyToMcp(updatedTask);

      return {
        content: [
          {
            type: 'text',
            text: `Task Updated Successfully:\n${JSON.stringify(transformedTask, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'update_task');
    }
  }

  /**
   * Handle query_tasks tool
   */
  private async handleQueryTasks(args: any) {
    // Validate input
    const validatedArgs = TaskQuerySchema.parse(args);
    try {
      // Build Rally query from MCP parameters
      const rallyQuery = this.buildRallyQueryForTasks(args);

      const response = await this.rallyClient.query('Task', rallyQuery);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      // Transform Rally data to MCP format
      const transformedTasks = response.QueryResult.Results.map(task =>
        this.dataTransformer.rallyToMcp(task)
      );

      return {
        content: [
          {
            type: 'text',
            text: `Found ${transformedTasks.length} Tasks:\n${JSON.stringify(transformedTasks, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'query_tasks');
    }
  }

  /**
   * Handle query_all_artifacts tool - unified artifact querying
   */
  private async handleQueryAllArtifacts(args: any) {
    // Validate input
    const validatedArgs = QueryAllArtifactsSchema.parse(args);
    try {
      const { artifactType, ...queryArgs } = args;

      // Validate artifact type
      const supportedTypes = ['UserStory', 'Defect', 'Task', 'HierarchicalRequirement'];
      if (!supportedTypes.includes(artifactType)) {
        throw new Error(`Unsupported artifact type: ${artifactType}. Supported types: ${supportedTypes.join(', ')}`);
      }

      // Build appropriate query based on artifact type
      let rallyQuery;
      switch (artifactType) {
        case 'UserStory':
        case 'HierarchicalRequirement':
          rallyQuery = this.buildRallyQuery(queryArgs);
          break;
        case 'Defect':
          rallyQuery = this.buildRallyQueryForDefects(queryArgs);
          break;
        case 'Task':
          rallyQuery = this.buildRallyQueryForTasks(queryArgs);
          break;
        default:
          rallyQuery = this.buildRallyQuery(queryArgs);
      }

      const response = await this.rallyClient.query(artifactType, rallyQuery);

      if (response.QueryResult.Errors.length > 0) {
        throw new Error(response.QueryResult.Errors.join(', '));
      }

      // Transform Rally data to MCP format
      const transformedArtifacts = response.QueryResult.Results.map(artifact =>
        this.dataTransformer.rallyToMcp(artifact)
      );

      return {
        content: [
          {
            type: 'text',
            text: `Found ${transformedArtifacts.length} ${artifactType} artifacts:\n${JSON.stringify(transformedArtifacts, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw this.handleToolError(error, 'query_all_artifacts');
    }
  }

  /**
   * Build Rally query from MCP parameters for User Stories
   */
  private buildRallyQuery(args: any): any {
    const query: any = {};

    // Build query string from individual filters
    const queryParts: string[] = [];

    if (args.project) {
      queryParts.push(`(Project.Name = "${args.project}")`);
    }

    if (args.owner) {
      queryParts.push(`(Owner.Name = "${args.owner}")`);
    }

    if (args['schedule-state']) {
      queryParts.push(`(ScheduleState = "${args['schedule-state']}")`);
    }

    if (args.iteration) {
      queryParts.push(`(Iteration.Name = "${args.iteration}")`);
    }

    if (args.query) {
      queryParts.push(args.query);
    }

    // Add common query parameters
    this.addCommonQueryParams(query, args);

    if (queryParts.length > 0) {
      query.query = queryParts.join(' AND ');
    }

    return query;
  }

  /**
   * Build Rally query from MCP parameters for Defects
   */
  private buildRallyQueryForDefects(args: any): any {
    const query: any = {};
    const queryParts: string[] = [];

    if (args.project) {
      queryParts.push(`(Project.Name = "${args.project}")`);
    }

    if (args.owner) {
      queryParts.push(`(Owner.Name = "${args.owner}")`);
    }

    if (args.state) {
      queryParts.push(`(State = "${args.state}")`);
    }

    if (args.severity) {
      queryParts.push(`(Severity = "${args.severity}")`);
    }

    if (args.priority) {
      queryParts.push(`(Priority = "${args.priority}")`);
    }

    if (args.resolution) {
      queryParts.push(`(Resolution = "${args.resolution}")`);
    }

    if (args['found-in-build']) {
      queryParts.push(`(FoundInBuild = "${args['found-in-build']}")`);
    }

    if (args['fixed-in-build']) {
      queryParts.push(`(FixedInBuild = "${args['fixed-in-build']}")`);
    }

    if (args.iteration) {
      queryParts.push(`(Iteration.Name = "${args.iteration}")`);
    }

    if (args.query) {
      queryParts.push(args.query);
    }

    // Add common query parameters
    this.addCommonQueryParams(query, args);

    if (queryParts.length > 0) {
      query.query = queryParts.join(' AND ');
    }

    return query;
  }

  /**
   * Build Rally query from MCP parameters for Tasks
   */
  private buildRallyQueryForTasks(args: any): any {
    const query: any = {};
    const queryParts: string[] = [];

    if (args.project) {
      queryParts.push(`(Project.Name = "${args.project}")`);
    }

    if (args.owner) {
      queryParts.push(`(Owner.Name = "${args.owner}")`);
    }

    if (args.state) {
      queryParts.push(`(State = "${args.state}")`);
    }

    if (args['work-product']) {
      queryParts.push(`(WorkProduct = "${args['work-product']}")`);
    }

    if (args['parent-user-story']) {
      queryParts.push(`(WorkProduct.FormattedID = "${args['parent-user-story']}")`);
    }

    if (args['parent-defect']) {
      queryParts.push(`(WorkProduct.FormattedID = "${args['parent-defect']}")`);
    }

    if (args.iteration) {
      queryParts.push(`(Iteration.Name = "${args.iteration}")`);
    }

    // Task-specific progress tracking filters
    if (args['todo-hours'] !== undefined) {
      queryParts.push(`(ToDo >= ${args['todo-hours']})`);
    }

    if (args['actual-hours'] !== undefined) {
      queryParts.push(`(Actuals >= ${args['actual-hours']})`);
    }

    if (args['estimate-hours'] !== undefined) {
      queryParts.push(`(Estimate >= ${args['estimate-hours']})`);
    }

    if (args.query) {
      queryParts.push(args.query);
    }

    // Add common query parameters
    this.addCommonQueryParams(query, args);

    if (queryParts.length > 0) {
      query.query = queryParts.join(' AND ');
    }

    return query;
  }

  /**
   * Add common query parameters for pagination, ordering, etc.
   */
  private addCommonQueryParams(query: any, args: any): void {
    if (args.fetch) {
      query.fetch = args.fetch;
    }

    if (args.order) {
      query.order = args.order;
    }

    if (args.start !== undefined) {
      query.start = args.start;
    }

    if (args.pagesize !== undefined) {
      query.pagesize = Math.min(args.pagesize, 200); // Rally max is 200
    }

    if (args.workspace) {
      query.workspace = args.workspace;
    }

    if (args.project) {
      // If project is a reference rather than name filter
      if (args.project.startsWith('/project/') || args.project.startsWith('https://')) {
        query.project = args.project;
      }
    }
  }

  /**
   * Handle and translate tool errors
   */
  private handleToolError(error: unknown, toolName: string): MCPError {
    if (error && typeof error === 'object' && 'type' in error) {
      // Already an MCPError
      return error as MCPError;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine error type based on message patterns
    let errorType = MCPErrorType.RALLY_API_ERROR;

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      errorType = MCPErrorType.NOT_FOUND_ERROR;
    } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
      errorType = MCPErrorType.AUTHENTICATION_ERROR;
    } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
      errorType = MCPErrorType.PERMISSION_ERROR;
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorType = MCPErrorType.VALIDATION_ERROR;
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorType = MCPErrorType.NETWORK_ERROR;
    }

    return {
      type: errorType,
      message: `Tool ${toolName} failed: ${errorMessage}`,
      details: error
    };
  }
}
