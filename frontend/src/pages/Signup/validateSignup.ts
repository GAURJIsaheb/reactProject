export function validateSignup(
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
  strength: number
): string | null {

  if (!username.trim() || !email.trim() || !password || !confirmPassword) {
    return "All fields required";
  }

  if (username.trim().length < 3) {
    return "Username must be at least 3 chars";
  }

  if (!email.includes("@")) {
    return "Invalid email";
  }

  if (password !== confirmPassword) {
    return "Passwords don't match";
  }

  if (strength < 3) {
    return "Password too weak";
  }

  return null;
}