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

  // ─── Email Validators ──────────────────────────────────────────
  const emailTrimmed = email.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailTrimmed)) {
    return "Invalid email format";
  }

  if (emailTrimmed.length > 254) {                        // RFC 5321 limit
    return "Email is too long";
  }

  const [localPart, domain] = emailTrimmed.split("@");

  if (localPart.length > 64) {                            // RFC 5321 local-part limit
    return "Email local part is too long";
  }

  if (domain.length > 253) {
    return "Email domain is too long";
  }

  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return "Email cannot start or end with a dot";
  }

  if (localPart.includes("..")) {
    return "Email cannot have consecutive dots";
  }

  if (!domain.includes(".")) {
    return "Email domain must have a valid TLD";
  }

  const tld = domain.split(".").pop()!;
  if (tld.length < 2) {
    return "Email TLD is too short";
  }

  if (!emailTrimmed.toLowerCase().endsWith("@gmail.com")) {  
    return "Only Gmail addresses are allowed";
  }
  // ──────────────────────────────────────────────────────────────

  if (password !== confirmPassword) {
    return "Passwords don't match";
  }

  if (strength < 3) {
    return "Password too weak";
  }

  return null;
}