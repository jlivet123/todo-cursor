// Global state to track task operations
let isTaskOperationInProgress = false;

/**
 * Executes a task operation with a lock to prevent race conditions
 * @param operation The async function to execute
 * @returns The result of the operation
 */
export async function withTaskLock<T>(operation: () => Promise<T>): Promise<T> {
  if (isTaskOperationInProgress) {
    console.log("Task operation already in progress, skipping");
    throw new Error("Another task operation is in progress");
  }

  isTaskOperationInProgress = true;
  console.log("Task operation lock acquired");

  try {
    const result = await operation();
    return result;
  } finally {
    // Release the lock after a delay to ensure all operations complete
    setTimeout(() => {
      isTaskOperationInProgress = false;
      console.log("Task operation lock released");
    }, 2000);
  }
}

/**
 * Checks if a task operation is currently in progress
 * @returns boolean indicating if an operation is in progress
 */
export function isTaskOperationActive(): boolean {
  return isTaskOperationInProgress;
}
