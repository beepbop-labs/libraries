import { greet, add, User } from "./utils";

console.log(greet("Developer"));

const result = add(5, 10);
console.log(`5 + 10 = ${result}`);

const user: User = {
  id: 1,
  name: "Test User",
  email: "test@example.comopop",
};

console.log("Created user:", user);

// Introduce a TypeScript error - calling greet with wrong type

// Test hot reloading by editing this file!
