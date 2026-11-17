export type AssistantState = 'available' | 'listening' | 'processing' | 'responding';

export interface AssistantStateConfig {
  label: string;
  detail: string;
  statusColor: string;
}
