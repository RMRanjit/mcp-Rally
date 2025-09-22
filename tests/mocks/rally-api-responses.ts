/**
 * Mock Rally API Responses
 *
 * Realistic Rally API response data for testing all supported operations.
 * Based on actual Rally Web Services API v2.0 response format.
 */

import { RallyResponse } from '../../src/core/interfaces';

// Mock User Story responses
export const mockUserStoryResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _rallyAPIMajor: "2",
        _rallyAPIMinor: "0",
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345678901",
        _refObjectUUID: "550c1234-ab12-4567-8901-123456789012",
        _objectVersion: "5",
        _type: "HierarchicalRequirement",
        Subscription: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/subscription/123456",
          _refObjectUUID: "f0f0f0f0-1234-5678-9012-abcdefabcdef",
          _type: "Subscription"
        },
        Workspace: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/123456",
          _refObjectUUID: "d1234567-e890-1234-5678-901234567890",
          _type: "Workspace",
          Name: "Test Workspace"
        },
        ObjectID: 12345678901,
        ObjectUUID: "550c1234-ab12-4567-8901-123456789012",
        FormattedID: "US1234",
        Name: "User login functionality",
        Description: "As a user, I want to log in to the system so that I can access my personalized dashboard.",
        Notes: "Initial implementation should support email/password authentication.",
        Owner: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectUUID: "abcd1234-5678-9012-3456-789012345678",
          _type: "User",
          _refObjectName: "John Doe"
        },
        Project: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
          _refObjectUUID: "proj1234-5678-9012-3456-789012345678",
          _type: "Project",
          _refObjectName: "Authentication Module"
        },
        ScheduleState: "Defined",
        PlanEstimate: 5.0,
        TaskActualTotal: 0.0,
        TaskEstimateTotal: 0.0,
        TaskRemainingTotal: 0.0,
        Iteration: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/iteration/123456",
          _refObjectUUID: "iter1234-5678-9012-3456-789012345678",
          _type: "Iteration",
          _refObjectName: "Sprint 1"
        },
        Release: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/release/123456",
          _refObjectUUID: "rel12345-6789-0123-4567-890123456789",
          _type: "Release",
          _refObjectName: "Release 1.0"
        },
        CreationDate: "2024-01-15T10:30:00.000Z",
        LastUpdateDate: "2024-01-20T14:45:00.000Z",
        Blocked: false,
        BlockedReason: null,
        Ready: true,
        Tags: {
          _rallyAPIMajor: "2",
          _rallyAPIMinor: "0",
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345678901/tags",
          Count: 2
        },
        DefectStatus: "NONE",
        TaskStatus: "NONE",
        c_CustomPriority: "High",
        c_BusinessValue: "Critical"
      }
    ],
    TotalResultCount: 1,
    StartIndex: 1,
    PageSize: 20
  }
};

export const mockUserStoryListResponse: RallyResponse<any[]> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345678901",
        _type: "HierarchicalRequirement",
        ObjectID: 12345678901,
        FormattedID: "US1234",
        Name: "User login functionality",
        ScheduleState: "Defined",
        PlanEstimate: 5.0,
        Owner: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectName: "John Doe"
        },
        Project: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
          _refObjectName: "Authentication Module"
        }
      },
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345678902",
        _type: "HierarchicalRequirement",
        ObjectID: 12345678902,
        FormattedID: "US1235",
        Name: "Password reset functionality",
        ScheduleState: "In-Progress",
        PlanEstimate: 3.0,
        Owner: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123457",
          _refObjectName: "Jane Smith"
        },
        Project: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
          _refObjectName: "Authentication Module"
        }
      }
    ],
    TotalResultCount: 2,
    StartIndex: 1,
    PageSize: 20
  }
};

// Mock Defect responses
export const mockDefectResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/defect/98765432101",
        _refObjectUUID: "defect12-3456-7890-1234-567890123456",
        _type: "Defect",
        ObjectID: 98765432101,
        FormattedID: "DE1001",
        Name: "Login button not responding",
        Description: "When user clicks the login button, the form doesn't submit properly.",
        State: "Open",
        Severity: "High Attention",
        Priority: "High",
        Owner: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectName: "John Doe"
        },
        Submitter: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123458",
          _refObjectName: "Test User"
        },
        Project: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
          _refObjectName: "Authentication Module"
        },
        Iteration: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/iteration/123456",
          _refObjectName: "Sprint 1"
        },
        Release: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/release/123456",
          _refObjectName: "Release 1.0"
        },
        Environment: "Production",
        FoundInBuild: "1.0.1",
        FixedInBuild: null,
        Resolution: null,
        CreationDate: "2024-01-18T09:15:00.000Z",
        LastUpdateDate: "2024-01-18T09:15:00.000Z",
        c_ReproductionSteps: "1. Go to login page\n2. Enter credentials\n3. Click login button",
        c_BusinessImpact: "Users cannot log in"
      }
    ],
    TotalResultCount: 1,
    StartIndex: 1,
    PageSize: 20
  }
};

// Mock Task responses
export const mockTaskResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/task/45678901234",
        _refObjectUUID: "task1234-5678-9012-3456-789012345678",
        _type: "Task",
        ObjectID: 45678901234,
        FormattedID: "TA1001",
        Name: "Implement OAuth authentication",
        Description: "Set up OAuth 2.0 authentication flow with Google and GitHub providers.",
        State: "In-Progress",
        Owner: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectName: "John Doe"
        },
        Project: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
          _refObjectName: "Authentication Module"
        },
        WorkProduct: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345678901",
          _refObjectName: "US1234: User login functionality"
        },
        Iteration: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/iteration/123456",
          _refObjectName: "Sprint 1"
        },
        Release: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/release/123456",
          _refObjectName: "Release 1.0"
        },
        Estimate: 8.0,
        ToDo: 2.0,
        Actuals: 6.0,
        TaskIndex: 1,
        Blocked: false,
        Ready: true,
        CreationDate: "2024-01-16T11:00:00.000Z",
        LastUpdateDate: "2024-01-19T16:30:00.000Z",
        c_TechnicalNotes: "Use passport.js for OAuth implementation"
      }
    ],
    TotalResultCount: 1,
    StartIndex: 1,
    PageSize: 20
  }
};

// Mock error responses
export const mockRallyErrorResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [
      "Invalid object identifier. ObjectID must be a valid integer.",
      "Cannot perform operation on 'UserStory' object."
    ],
    Warnings: [
      "Query returned partial results due to data permissions."
    ],
    Results: [],
    TotalResultCount: 0,
    StartIndex: 1,
    PageSize: 20
  }
};

// Mock authentication response
export const mockAuthResponse = {
  OperationResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        SecurityToken: "abc123-def456-ghi789",
        User: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectName: "john.doe@example.com"
        }
      }
    ]
  }
};

// Mock workspace/project structure
export const mockWorkspaceResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/123456",
        _type: "Workspace",
        ObjectID: 123456,
        Name: "Test Workspace",
        Description: "Main development workspace",
        State: "Open",
        CreationDate: "2023-01-01T00:00:00.000Z"
      }
    ],
    TotalResultCount: 1,
    StartIndex: 1,
    PageSize: 20
  }
};

export const mockProjectResponse: RallyResponse<any> = {
  QueryResult: {
    Errors: [],
    Warnings: [],
    Results: [
      {
        _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/project/123456",
        _type: "Project",
        ObjectID: 123456,
        Name: "Authentication Module",
        Description: "User authentication and authorization features",
        State: "Open",
        Owner: {
          _ref: "https://rally1.rallydev.com/slm/webservice/v2.0/user/123456",
          _refObjectName: "John Doe"
        },
        CreationDate: "2023-06-01T00:00:00.000Z"
      }
    ],
    TotalResultCount: 1,
    StartIndex: 1,
    PageSize: 20
  }
};

// Helper function to create mock responses with different data
export function createMockUserStory(overrides: Partial<any> = {}): any {
  const baseStory = mockUserStoryResponse.QueryResult.Results[0];
  return {
    ...baseStory,
    ...overrides,
    ObjectID: overrides.ObjectID || Math.floor(Math.random() * 1000000000),
    FormattedID: overrides.FormattedID || `US${Math.floor(Math.random() * 9999)}`,
    CreationDate: overrides.CreationDate || new Date().toISOString(),
    LastUpdateDate: overrides.LastUpdateDate || new Date().toISOString()
  };
}

export function createMockDefect(overrides: Partial<any> = {}): any {
  const baseDefect = mockDefectResponse.QueryResult.Results[0];
  return {
    ...baseDefect,
    ...overrides,
    ObjectID: overrides.ObjectID || Math.floor(Math.random() * 1000000000),
    FormattedID: overrides.FormattedID || `DE${Math.floor(Math.random() * 9999)}`,
    CreationDate: overrides.CreationDate || new Date().toISOString(),
    LastUpdateDate: overrides.LastUpdateDate || new Date().toISOString()
  };
}

export function createMockTask(overrides: Partial<any> = {}): any {
  const baseTask = mockTaskResponse.QueryResult.Results[0];
  return {
    ...baseTask,
    ...overrides,
    ObjectID: overrides.ObjectID || Math.floor(Math.random() * 1000000000),
    FormattedID: overrides.FormattedID || `TA${Math.floor(Math.random() * 9999)}`,
    CreationDate: overrides.CreationDate || new Date().toISOString(),
    LastUpdateDate: overrides.LastUpdateDate || new Date().toISOString()
  };
}

// HTTP status code mock responses
export const mockHttpResponses = {
  success: {
    status: 200,
    statusText: 'OK',
    data: mockUserStoryResponse
  },
  created: {
    status: 201,
    statusText: 'Created',
    data: mockUserStoryResponse
  },
  unauthorized: {
    status: 401,
    statusText: 'Unauthorized',
    data: {
      QueryResult: {
        Errors: ["Unauthorized access. Invalid API key."],
        Warnings: [],
        Results: []
      }
    }
  },
  forbidden: {
    status: 403,
    statusText: 'Forbidden',
    data: {
      QueryResult: {
        Errors: ["Access denied. Insufficient permissions."],
        Warnings: [],
        Results: []
      }
    }
  },
  notFound: {
    status: 404,
    statusText: 'Not Found',
    data: {
      QueryResult: {
        Errors: ["Resource not found."],
        Warnings: [],
        Results: []
      }
    }
  },
  validationError: {
    status: 422,
    statusText: 'Unprocessable Entity',
    data: {
      QueryResult: {
        Errors: ["Validation failed. Name field is required."],
        Warnings: [],
        Results: []
      }
    }
  },
  serverError: {
    status: 500,
    statusText: 'Internal Server Error',
    data: {
      QueryResult: {
        Errors: ["Internal server error occurred."],
        Warnings: [],
        Results: []
      }
    }
  }
};