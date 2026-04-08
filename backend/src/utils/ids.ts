export function createTransactionRef(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `TX-${timestamp}-${random}`;
}

export function createAccountNumber(): string {
  const suffix = `${Date.now()}`.slice(-6);
  const random = Math.floor(100 + Math.random() * 900);

  return `ACC${suffix}${random}`;
}
