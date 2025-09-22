/**
 * Schema Definitions Using Zod
 *
 * Central schema definitions for validation of MCP tools and Rally API data.
 * Implements runtime type checking and validation.
 *
 * Requirements: ADR-005 (Schema Validation Architecture), req-001, req-002, req-003, req-005
 */

import { z } from 'zod';

// User Story Schemas (Requirements: req-001, req-002, req-003)
export const UserStoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  project: z.string().min(1, 'Project is required'),
  owner: z.string().optional(),
  iteration: z.string().optional(),
  'plan-estimate': z.number().optional(),
  'schedule-state': z.string().optional(),
});

export const UserStoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
  iteration: z.string().optional(),
  'plan-estimate': z.number().optional(),
  'schedule-state': z.string().optional(),
});

export const UserStoryQuerySchema = z.object({
  project: z.string().optional(),
  owner: z.string().optional(),
  'schedule-state': z.string().optional(),
  iteration: z.string().optional(),
  query: z.string().optional(),
});

// Defect Schemas (Requirements: req-005, req-006, req-007)
export const DefectCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  severity: z.enum(['Cosmetic', 'Minor', 'Major', 'Critical']),
  state: z.enum(['Submitted', 'Open', 'In-Progress', 'Fixed', 'Closed']),
  owner: z.string().optional(),
  'found-in-build': z.string().optional(),
  project: z.string().min(1, 'Project is required'),
});

export const DefectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.enum(['Cosmetic', 'Minor', 'Major', 'Critical']).optional(),
  state: z.enum(['Submitted', 'Open', 'In-Progress', 'Fixed', 'Closed']).optional(),
  owner: z.string().optional(),
  'found-in-build': z.string().optional(),
  'fixed-in-build': z.string().optional(),
  resolution: z.string().optional(),
});

export const DefectQuerySchema = z.object({
  project: z.string().optional(),
  owner: z.string().optional(),
  state: z.string().optional(),
  severity: z.string().optional(),
  priority: z.string().optional(),
  resolution: z.string().optional(),
  'found-in-build': z.string().optional(),
  'fixed-in-build': z.string().optional(),
  iteration: z.string().optional(),
  query: z.string().optional(),
});

export const DefectStateUpdateSchema = z.object({
  objectId: z.string().min(1, 'ObjectID is required'),
  state: z.enum(['Submitted', 'Open', 'In-Progress', 'Fixed', 'Closed']),
  resolution: z.string().optional(),
  'fixed-in-build': z.string().optional(),
});

// Task Schemas (Requirements: req-008, req-009)
export const TaskCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  owner: z.string().optional(),
  'work-product': z.string().optional(), // Parent User Story or Defect
  estimate: z.number().optional(),
  todo: z.number().optional(),
  state: z.enum(['Defined', 'In-Progress', 'Completed']).optional(),
});

export const TaskUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  owner: z.string().optional(),
  estimate: z.number().optional(),
  todo: z.number().optional(),
  actuals: z.number().optional(),
  state: z.enum(['Defined', 'In-Progress', 'Completed']).optional(),
});

export const TaskQuerySchema = z.object({
  project: z.string().optional(),
  owner: z.string().optional(),
  state: z.string().optional(),
  'work-product': z.string().optional(),
  'parent-user-story': z.string().optional(),
  'parent-defect': z.string().optional(),
  iteration: z.string().optional(),
  'todo-hours': z.number().optional(),
  'actual-hours': z.number().optional(),
  'estimate-hours': z.number().optional(),
  query: z.string().optional(),
});

export const QueryAllArtifactsSchema = z.object({
  artifactType: z.enum(['UserStory', 'HierarchicalRequirement', 'Defect', 'Task']),
  project: z.string().optional(),
  owner: z.string().optional(),
  state: z.string().optional(),
  iteration: z.string().optional(),
  query: z.string().optional(),
  fetch: z.string().optional(),
  order: z.string().optional(),
  start: z.number().optional(),
  pagesize: z.number().max(200).optional(),
  workspace: z.string().optional(),
});

// Object ID schemas for get operations
export const ObjectIdSchema = z.object({
  objectId: z.string().min(1, 'ObjectID is required'),
});

// Rally API Response Schema
export const RallyResponseSchema = z.object({
  QueryResult: z.object({
    Errors: z.array(z.string()),
    Warnings: z.array(z.string()),
    Results: z.array(z.unknown()),
    TotalResultCount: z.number().optional(),
    StartIndex: z.number().optional(),
    PageSize: z.number().optional(),
  }),
});

// Environment Configuration Schema
export const EnvironmentConfigSchema = z.object({
  RALLY_API_KEY: z.string().min(1, 'Rally API key is required'),
  RALLY_INTEGRATION_VENDOR: z.string().default('AI-Assistant'),
  RALLY_TRANSPORT: z.enum(['stdio', 'sse']).default('stdio'),
  RALLY_SERVER_PORT: z.coerce.number().default(3000),
  RALLY_BASE_URL: z.string().url().default('https://rally1.rallydev.com'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Type exports for TypeScript
export type UserStoryCreate = z.infer<typeof UserStoryCreateSchema>;
export type UserStoryUpdate = z.infer<typeof UserStoryUpdateSchema>;
export type UserStoryQuery = z.infer<typeof UserStoryQuerySchema>;
export type DefectCreate = z.infer<typeof DefectCreateSchema>;
export type DefectUpdate = z.infer<typeof DefectUpdateSchema>;
export type DefectQuery = z.infer<typeof DefectQuerySchema>;
export type DefectStateUpdate = z.infer<typeof DefectStateUpdateSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type QueryAllArtifacts = z.infer<typeof QueryAllArtifactsSchema>;
export type ObjectId = z.infer<typeof ObjectIdSchema>;
export type RallyResponse = z.infer<typeof RallyResponseSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
