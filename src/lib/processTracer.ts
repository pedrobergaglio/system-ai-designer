/**
 * Process tracer utility for debugging ERP design generation flow
 */
const DEBUG = true;

// Store a global trace of what's happening
const processTrace: {step: string, timestamp: number, data?: any}[] = [];

/**
 * Add a step to the process trace
 */
export function traceStep(step: string, data?: any) {
  const timestamp = Date.now();
  
  if (DEBUG) {
    console.log(`[TRACE ${new Date(timestamp).toISOString()}] ${step}`, data ? data : '');
  }
  
  processTrace.push({
    step,
    timestamp,
    data
  });
}

/**
 * Get the full process trace
 */
export function getProcessTrace() {
  return processTrace;
}

/**
 * Clear the process trace
 */
export function clearProcessTrace() {
  processTrace.length = 0;
}

/**
 * Calculate time elapsed between steps
 */
export function getTimeElapsed(stepA: string, stepB: string): number | null {
  const stepAEntry = processTrace.find(entry => entry.step === stepA);
  const stepBEntry = processTrace.find(entry => entry.step === stepB);
  
  if (!stepAEntry || !stepBEntry) {
    return null;
  }
  
  return stepBEntry.timestamp - stepAEntry.timestamp;
}

/**
 * Wrap a function with tracing
 */
export function withTracing<T extends (...args: any[]) => Promise<any>>(
  name: string, 
  fn: T
): T {
  return (async (...args: any[]) => {
    traceStep(`${name}.start`, { args });
    try {
      const result = await fn(...args);
      traceStep(`${name}.complete`, { result });
      return result;
    } catch (error) {
      traceStep(`${name}.error`, { error });
      throw error;
    }
  }) as T;
}

// Diagnostics log to help debug the current process state
export function dumpProcessState() {
  console.log('==== PROCESS STATE DUMP ====');
  console.log(`Steps recorded: ${processTrace.length}`);
  
  if (processTrace.length > 0) {
    console.log('Process timeline:');
    processTrace.forEach((entry, i) => {
      const time = new Date(entry.timestamp).toISOString();
      if (i > 0) {
        const elapsed = entry.timestamp - processTrace[i-1].timestamp;
        console.log(`  ${time} [+${elapsed}ms]: ${entry.step}`);
      } else {
        console.log(`  ${time} [start]: ${entry.step}`);
      }
    });
  }
  
  console.log('===========================');
}
