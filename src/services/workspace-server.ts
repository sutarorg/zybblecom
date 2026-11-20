import "server-only";
import { cache } from "react";
import { createWorkspaceServices } from "./workspace";
/** Session 5: every server operation must resolve the verified session before reading data. */
export const workspace = createWorkspaceServices();
export const getProfile = cache(() => workspace.run("getProfile"));
export const getBalance = cache(() => workspace.run("getBalance"));
