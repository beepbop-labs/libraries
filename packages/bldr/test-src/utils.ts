export function greet(name: string): string {
  return `Hello, ${name}! Welcome to the bldr test environment.`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export interface User {
  id: number;
  name: string;
  email: string;
}
