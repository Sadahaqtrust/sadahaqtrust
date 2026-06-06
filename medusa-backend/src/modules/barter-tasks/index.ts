import { Module } from "@medusajs/framework/utils"
import BarterTasksModuleService from "./services/barter-tasks-module-service"

export const BARTER_TASKS_MODULE = "barterTasksModuleService"

export default Module(BARTER_TASKS_MODULE, {
  service: BarterTasksModuleService,
})

export { Task } from "./models/task"
export { TaskApplication } from "./models/task-application"
export { default as BarterTasksModuleService } from "./services/barter-tasks-module-service"
