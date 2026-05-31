export type User = { id:string; username:string; role:string }
export type Project = { ID:string; Name:string; Description:string; CreatedAt:string; UpdatedAt:string }
export type Stage = { Key:string; Name:string; Position:number }
export type Task = { ID:string; ProjectID:string; ParentID:string; Title:string; Description:string; StageKey:string; Status:string; AgentReady:boolean; Locked:boolean; Completed:boolean; AgentID:string }
export type Repository = { ID:string; ProjectID:string; Name:string; GitURL:string; WebhookSecret:string; WebhookEnabled:boolean }
export type Commit = { ID:string; ProjectID:string; RepositoryID:string; SHA:string; Message:string; Author:string; Branch:string; CommittedAt:string }
