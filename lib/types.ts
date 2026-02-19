// Tipos TypeScript baseados nas tabelas do PostgreSQL

export interface User {
  phone_number: string;
  complete_name: string | null;
  require_human: boolean;
  complete_register: boolean;
  origin_contact: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

// message é JSONB: { type, content } ou tool_calls
export interface ChatMessage {
  type?: string;
  content?: string;
}

export interface Chat {
  id: number;
  session_id: string;
  sender: "human" | "ai" | "user";
  agent_name: string | null;
  message: ChatMessage | Record<string, unknown>;
  created_at: Date;
}

export interface CalendarEvent {
  id: number;
  user_number: string;
  event_id: string;
  summary: string;
  dr_responsible: string;
  procedure: string | null;
  description: string | null;
  status: "pending" | "confirmed" | "canceled";
  start_time: Date;
  end_time: Date;
  created_at: Date;
}

export interface Procedure {
  nome: string;
  duracao_minutos: number;
  preco: number | "definir_com_doutor";
  descricao: string | null;
  triagem: string | null;
}

export interface DoctorRule {
  id: string;
  name: string;
  doctor_number: string;
  calendar_id: string;
  active: boolean;
  procedures: Procedure[];
  available_weekdays: number[]; // 0=domingo, 1=segunda, ..., 6=sábado
  working_hours: {
    manha?: { inicio: string; fim: string };
    tarde?: { inicio: string; fim: string };
  };
  insurances: string[]; // lowercase
  restrictions: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface RAGEmbedding {
  id: string;
  content: string;
  category: string; // lowercase
  embedding: number[]; // 1536 dimensions
  created_at: Date;
}

export interface File {
  id: number;
  category: string; // lowercase
  fileName: string;
  mediaType: string;
  path: string; // URL pública
  created_at: Date;
}

export interface TokenUsage {
  id: string;
  phone_number: string;
  message_id: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model_name: string;
  provider: string;
  created_at: Date;
}
