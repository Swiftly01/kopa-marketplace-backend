export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<string>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
