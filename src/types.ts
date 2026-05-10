export type VitalStatus = "living" | "deceased" | "unknown";

export type WellbeingState =
  | "thriving"
  | "stable"
  | "needs-attention"
  | "critical"
  | "unknown";

export type ContactState = "active" | "infrequent" | "no-contact" | "unknown";

export type EventType =
  | "birth"
  | "death"
  | "marriage"
  | "move"
  | "health"
  | "career"
  | "education"
  | "memory"
  | "status"
  | "custom";

export type Confidence = "confirmed" | "likely" | "needs-source";

export type SourceType = "record" | "interview" | "photo" | "document" | "web" | "other";

export type MemoryType = "photo" | "story" | "document" | "audio" | "video" | "other";

export interface SourceRecord {
  id: string;
  title: string;
  type: SourceType;
  url?: string;
  note: string;
  confidence: Confidence;
  linkedPersonIds: string[];
  addedAt: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  type: MemoryType;
  url?: string;
  date?: string;
  note: string;
  privacy: "family" | "private" | "shared";
}

export interface FamilyEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  note: string;
  location?: string;
  confidence: Confidence;
  sourceIds?: string[];
}

export interface Person {
  id: string;
  givenName: string;
  familyName: string;
  nickname?: string;
  gender: "female" | "male" | "nonbinary" | "unknown";
  birthDate?: string;
  deathDate?: string;
  location?: string;
  occupation?: string;
  vitalStatus: VitalStatus;
  wellbeing: WellbeingState;
  contactState: ContactState;
  privacy: "family" | "private" | "shared";
  tags: string[];
  notes: string;
  parents: string[];
  partners: string[];
  children: string[];
  events: FamilyEvent[];
  sourceIds?: string[];
  memories?: MemoryItem[];
}

export interface FamilyStore {
  people: Person[];
  sources: SourceRecord[];
  selectedPersonId: string;
  updatedAt: string;
}

export interface RelationshipDraft {
  relation: "parent" | "partner" | "child";
  givenName: string;
  familyName: string;
  gender: Person["gender"];
  vitalStatus: VitalStatus;
  wellbeing: WellbeingState;
  location: string;
}
