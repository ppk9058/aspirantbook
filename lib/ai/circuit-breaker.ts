import { AiProviderName } from "./types"
import { aiConfig } from "./config"

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

interface ProviderCircuit {
  state: CircuitState
  failureCount: number
  lastFailureTime: number
  lastSuccessTime: number
}

class CircuitBreakerManager {
  private circuits: Map<AiProviderName, ProviderCircuit> = new Map()

  private getCircuit(provider: AiProviderName): ProviderCircuit {
    let circuit = this.circuits.get(provider)
    if (!circuit) {
      circuit = {
        state: "CLOSED",
        failureCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
      }
      this.circuits.set(provider, circuit)
    }
    return circuit
  }

  public canAttempt(provider: AiProviderName): boolean {
    const circuit = this.getCircuit(provider)
    const now = Date.now()

    if (circuit.state === "CLOSED") {
      return true
    }

    if (circuit.state === "OPEN") {
      // Check if cooldown period has elapsed
      if (now - circuit.lastFailureTime > aiConfig.circuitBreakerCooldownMs) {
        circuit.state = "HALF_OPEN"
        return true
      }
      return false
    }

    if (circuit.state === "HALF_OPEN") {
      // In HALF_OPEN, allow probe
      return true
    }

    return true
  }

  public recordSuccess(provider: AiProviderName): void {
    const circuit = this.getCircuit(provider)
    circuit.state = "CLOSED"
    circuit.failureCount = 0
    circuit.lastSuccessTime = Date.now()
  }

  public recordFailure(provider: AiProviderName): void {
    const circuit = this.getCircuit(provider)
    circuit.failureCount++
    circuit.lastFailureTime = Date.now()

    if (circuit.failureCount >= aiConfig.circuitBreakerFailureThreshold) {
      circuit.state = "OPEN"
    }
  }

  public reset(provider?: AiProviderName): void {
    if (provider) {
      this.circuits.delete(provider)
    } else {
      this.circuits.clear()
    }
  }

  public getStatus(): Record<AiProviderName, { state: CircuitState; failureCount: number; lastFailureTime: number }> {
    const res: any = {}
    const providers: AiProviderName[] = ["gemini", "groq", "cerebras", "mistral", "openrouter"]
    for (const p of providers) {
      const c = this.getCircuit(p)
      res[p] = {
        state: c.state,
        failureCount: c.failureCount,
        lastFailureTime: c.lastFailureTime,
      }
    }
    return res
  }
}

export const circuitBreaker = new CircuitBreakerManager()
