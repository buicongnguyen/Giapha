import type { FamilyEvent, FamilyStore, Person, RelationshipDraft } from "./types";
import { makeEventId, makeId, seedStore } from "./data";

export const STORAGE_KEY = "giapha-family-state-v1";

export function loadStore(): FamilyStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return normalizeStore(seedStore);
  }

  try {
    const parsed = JSON.parse(raw) as FamilyStore;
    if (!Array.isArray(parsed.people) || parsed.people.length === 0) {
      return normalizeStore(seedStore);
    }
    return normalizeStore(parsed);
  } catch {
    return normalizeStore(seedStore);
  }
}

export function saveStore(store: FamilyStore) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...normalizeStore(store), updatedAt: new Date().toISOString() }),
  );
}

export function normalizeStore(store: FamilyStore): FamilyStore {
  const people = normalizeRelationshipLinks(store.people.length > 0 ? store.people : seedStore.people);
  const seedSourcesById = new Map(seedStore.sources.map((source) => [source.id, source]));
  const storedSources = Array.isArray(store.sources) ? store.sources : [];
  const sources = (storedSources.length > 0 ? storedSources : seedStore.sources).map((source) => ({
    ...source,
    note: source.note ?? "",
    url: source.url ?? "",
    linkedPersonIds: Array.from(new Set(source.linkedPersonIds ?? [])),
    addedAt: source.addedAt ?? seedSourcesById.get(source.id)?.addedAt ?? new Date().toISOString(),
  }));

  return {
    people,
    sources,
    selectedPersonId: people.some((person) => person.id === store.selectedPersonId)
      ? store.selectedPersonId
      : people[0]?.id ?? "",
    updatedAt: store.updatedAt ?? new Date().toISOString(),
  };
}

export function getFullName(person: Person) {
  return [person.givenName, person.familyName].filter(Boolean).join(" ");
}

export function getInitials(person: Person) {
  const initials = `${person.givenName.charAt(0)}${person.familyName.charAt(0)}`;
  return initials.toUpperCase() || "??";
}

export function formatDate(date?: string) {
  if (!date) return "Unknown";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function calculateAge(person: Person) {
  if (!person.birthDate) return null;
  const birth = new Date(`${person.birthDate}T00:00:00`);
  const end = person.deathDate ? new Date(`${person.deathDate}T00:00:00`) : new Date();
  if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime())) return null;
  let age = end.getFullYear() - birth.getFullYear();
  const monthDelta = end.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && end.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

export function normalizeRelationshipLinks(people: Person[]): Person[] {
  const byId = new Map(people.map((person) => [person.id, normalizePerson(person)]));

  const addUnique = (personId: string, field: "parents" | "partners" | "children", value: string) => {
    const person = byId.get(personId);
    if (!person) return;
    person[field] = Array.from(new Set([...person[field], value])).filter(Boolean);
  };

  for (const person of byId.values()) {
    for (const parentId of person.parents) {
      addUnique(parentId, "children", person.id);
    }
    for (const childId of person.children) {
      addUnique(childId, "parents", person.id);
    }
    for (const partnerId of person.partners) {
      addUnique(partnerId, "partners", person.id);
    }
  }

  return Array.from(byId.values()).map((person) => ({
    ...person,
    parents: Array.from(new Set(person.parents)),
    partners: Array.from(new Set(person.partners.filter((id) => id !== person.id))),
    children: Array.from(new Set(person.children)),
  }));
}

export function updatePerson(people: Person[], updated: Person) {
  return normalizeRelationshipLinks(people.map((person) => (person.id === updated.id ? updated : person)));
}

function normalizePerson(person: Person): Person {
  return {
    ...person,
    givenName: person.givenName ?? "",
    familyName: person.familyName ?? "",
    gender: person.gender ?? "unknown",
    vitalStatus: person.vitalStatus ?? "unknown",
    wellbeing: person.wellbeing ?? "unknown",
    contactState: person.contactState ?? "unknown",
    privacy: person.privacy ?? "family",
    tags: person.tags ?? [],
    notes: person.notes ?? "",
    parents: person.parents ?? [],
    partners: person.partners ?? [],
    children: person.children ?? [],
    events: (person.events ?? []).map((event) => ({
      ...event,
      note: event.note ?? "",
      confidence: event.confidence ?? "needs-source",
      sourceIds: event.sourceIds ?? [],
    })),
    sourceIds: person.sourceIds ?? [],
    memories: (person.memories ?? []).map((memory) => ({
      ...memory,
      url: memory.url ?? "",
      note: memory.note ?? "",
      privacy: memory.privacy ?? "family",
    })),
  };
}

export function addRelative(people: Person[], baseId: string, draft: RelationshipDraft) {
  const base = people.find((person) => person.id === baseId);
  if (!base || !draft.givenName.trim()) {
    return { people, newPersonId: baseId };
  }

  const newPerson: Person = {
    id: makeId("person"),
    givenName: draft.givenName.trim(),
    familyName: draft.familyName.trim(),
    gender: "unknown",
    birthDate: "",
    deathDate: "",
    location: draft.location.trim(),
    occupation: "",
    vitalStatus: draft.vitalStatus,
    wellbeing: draft.wellbeing,
    contactState: "unknown",
    privacy: "family",
    tags: [],
    notes: "",
    parents: draft.relation === "child" ? [base.id] : [],
    partners: draft.relation === "partner" ? [base.id] : [],
    children: draft.relation === "parent" ? [base.id] : [],
    sourceIds: [],
    memories: [],
    events: [
      {
        id: makeEventId(),
        date: new Date().toISOString().slice(0, 10),
        type: "status",
        title: "Profile created",
        note: `Added as ${draft.relation} of ${getFullName(base)}.`,
        location: draft.location.trim(),
        confidence: "needs-source",
      },
    ],
  };

  const nextBase: Person = {
    ...base,
    parents:
      draft.relation === "parent"
        ? Array.from(new Set([...base.parents, newPerson.id]))
        : base.parents,
    partners:
      draft.relation === "partner"
        ? Array.from(new Set([...base.partners, newPerson.id]))
        : base.partners,
    children:
      draft.relation === "child"
        ? Array.from(new Set([...base.children, newPerson.id]))
        : base.children,
  };

  const nextPeople = people.map((person) => (person.id === base.id ? nextBase : person));
  return {
    people: normalizeRelationshipLinks([...nextPeople, newPerson]),
    newPersonId: newPerson.id,
  };
}

export function addEvent(people: Person[], personId: string, event: Omit<FamilyEvent, "id">) {
  return people.map((person) => {
    if (person.id !== personId) return person;
    return {
      ...person,
      events: [{ ...event, id: makeEventId() }, ...person.events].sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    };
  });
}

export function removePerson(people: Person[], personId: string) {
  return people
    .filter((person) => person.id !== personId)
    .map((person) => ({
      ...person,
      parents: person.parents.filter((id) => id !== personId),
      partners: person.partners.filter((id) => id !== personId),
      children: person.children.filter((id) => id !== personId),
    }));
}

export function createPublicExport(store: FamilyStore, people: Person[]) {
  const redactedIds = new Set(
    people
      .filter((person) => person.privacy === "private" || (person.vitalStatus === "living" && person.privacy !== "shared"))
      .map((person) => person.id),
  );

  const publicPeople = people.map((person) => {
    if (!redactedIds.has(person.id)) {
      return {
        ...person,
        memories: (person.memories ?? []).filter((memory) => memory.privacy === "shared"),
      };
    }

    return {
      ...person,
      givenName: "Private",
      familyName: "Person",
      nickname: "Redacted",
      birthDate: "",
      deathDate: "",
      location: "",
      occupation: "",
      vitalStatus: person.vitalStatus,
      wellbeing: "unknown" as const,
      contactState: "unknown" as const,
      tags: ["redacted"],
      notes: "Private or living profile hidden in public export.",
      events: [],
      sourceIds: [],
      memories: [],
    };
  });

  const publicSources = store.sources
    .map((source) => ({
      ...source,
      url: "",
      note: "Source detail retained in private archive.",
      linkedPersonIds: source.linkedPersonIds.filter((personId) => !redactedIds.has(personId)),
    }))
    .filter((source) => source.linkedPersonIds.length > 0);

  return {
    ...store,
    people: publicPeople,
    sources: publicSources,
    updatedAt: new Date().toISOString(),
  };
}

export function getGenerations(people: Person[]) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const generation = new Map<string, number>();
  const roots = people.filter((person) => person.parents.every((id) => !byId.has(id)));

  for (const root of roots) {
    generation.set(root.id, 0);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < people.length * 3) {
    changed = false;
    guard += 1;

    for (const person of people) {
      const parentLevels = person.parents
        .map((parentId) => generation.get(parentId))
        .filter((level): level is number => typeof level === "number");

      if (parentLevels.length > 0) {
        const nextLevel = Math.max(...parentLevels) + 1;
        if (generation.get(person.id) !== nextLevel) {
          generation.set(person.id, nextLevel);
          changed = true;
        }
      }

      const currentLevel = generation.get(person.id);
      if (typeof currentLevel === "number") {
        for (const partnerId of person.partners) {
          if (!generation.has(partnerId)) {
            generation.set(partnerId, currentLevel);
            changed = true;
          }
        }
      }
    }
  }

  for (const person of people) {
    if (!generation.has(person.id)) {
      generation.set(person.id, 0);
    }
  }

  return generation;
}

export function visiblePeople(people: Person[], query: string, vitalFilter: string, wellbeingFilter: string) {
  const term = query.trim().toLowerCase();
  return people.filter((person) => {
    const text = [
      getFullName(person),
      person.nickname,
      person.location,
      person.occupation,
      person.tags.join(" "),
      person.notes,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!term || text.includes(term)) &&
      (vitalFilter === "all" || person.vitalStatus === vitalFilter) &&
      (wellbeingFilter === "all" || person.wellbeing === wellbeingFilter)
    );
  });
}

export function metrics(people: Person[]) {
  return {
    total: people.length,
    living: people.filter((person) => person.vitalStatus === "living").length,
    private: people.filter((person) => person.privacy === "private").length,
    attention: people.filter((person) =>
      ["needs-attention", "critical", "unknown"].includes(person.wellbeing),
    ).length,
    needsSource: people.reduce(
      (count, person) =>
        count + person.events.filter((event) => event.confidence === "needs-source").length,
      0,
    ),
  };
}
