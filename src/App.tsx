import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Download,
  ExternalLink,
  FileDown,
  FileUp,
  HeartPulse,
  Image,
  Link2,
  LockKeyhole,
  MapPin,
  Maximize2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
  UserRoundPlus,
  UsersRound,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  addEvent,
  addRelative,
  calculateAge,
  createPublicExport,
  formatDate,
  getFullName,
  getGenerations,
  getInitials,
  loadStore,
  metrics,
  normalizeRelationshipLinks,
  normalizeStore,
  removePerson,
  saveStore,
  updatePerson,
  visiblePeople,
} from "./family";
import { makeMemoryId, makeSourceId, seedStore } from "./data";
import type {
  ContactState,
  EventType,
  FamilyEvent,
  FamilyStore,
  MemoryItem,
  MemoryType,
  Person,
  RelationshipDraft,
  SourceRecord,
  SourceType,
  VitalStatus,
  WellbeingState,
} from "./types";

const vitalLabels: Record<VitalStatus, string> = {
  living: "Living",
  deceased: "Deceased",
  unknown: "Unknown",
};

const wellbeingLabels: Record<WellbeingState, string> = {
  thriving: "Thriving",
  stable: "Stable",
  "needs-attention": "Needs attention",
  critical: "Critical",
  unknown: "Unknown",
};

const contactLabels: Record<ContactState, string> = {
  active: "Active",
  infrequent: "Infrequent",
  "no-contact": "No contact",
  unknown: "Unknown",
};

const genderLabels: Record<Person["gender"], string> = {
  female: "Female",
  male: "Male",
  nonbinary: "Nonbinary",
  unknown: "Unknown",
};

const eventTypeLabels: Record<EventType, string> = {
  birth: "Birth",
  death: "Death",
  marriage: "Marriage",
  move: "Move",
  health: "Health",
  career: "Career",
  education: "Education",
  memory: "Memory",
  status: "Status",
  custom: "Custom",
};

const sourceTypeLabels: Record<SourceType, string> = {
  record: "Record",
  interview: "Interview",
  photo: "Photo",
  document: "Document",
  web: "Web",
  other: "Other",
};

const memoryTypeLabels: Record<MemoryType, string> = {
  photo: "Photo",
  story: "Story",
  document: "Document",
  audio: "Audio",
  video: "Video",
  other: "Other",
};

const emptyRelationshipDraft: RelationshipDraft = {
  relation: "child",
  givenName: "",
  familyName: "",
  gender: "unknown",
  vitalStatus: "living",
  wellbeing: "unknown",
  location: "",
};

const emptyEventDraft: Omit<FamilyEvent, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  type: "status",
  title: "",
  note: "",
  location: "",
  confidence: "confirmed",
};

const emptySourceDraft: Omit<SourceRecord, "id" | "linkedPersonIds" | "addedAt"> = {
  title: "",
  type: "record",
  url: "",
  note: "",
  confidence: "confirmed",
};

const emptyMemoryDraft: Omit<MemoryItem, "id"> = {
  title: "",
  type: "story",
  url: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
  privacy: "family",
};

type QualityIssue = {
  personId: string;
  severity: "risk" | "warning" | "info";
  title: string;
  detail: string;
};

function App() {
  const [store, setStore] = useState<FamilyStore>(() => loadStore());
  const [query, setQuery] = useState("");
  const [vitalFilter, setVitalFilter] = useState("all");
  const [wellbeingFilter, setWellbeingFilter] = useState("all");
  const [relationshipDraft, setRelationshipDraft] =
    useState<RelationshipDraft>(emptyRelationshipDraft);
  const [eventDraft, setEventDraft] = useState<Omit<FamilyEvent, "id">>(emptyEventDraft);
  const [sourceDraft, setSourceDraft] =
    useState<Omit<SourceRecord, "id" | "linkedPersonIds" | "addedAt">>(emptySourceDraft);
  const [memoryDraft, setMemoryDraft] = useState<Omit<MemoryItem, "id">>(emptyMemoryDraft);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const people = useMemo(() => normalizeRelationshipLinks(store.people), [store.people]);
  const sources = useMemo(() => store.sources ?? [], [store.sources]);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selectedPerson = peopleById.get(store.selectedPersonId) ?? people[0];
  const selectedSources = useMemo(() => {
    if (!selectedPerson) return [];
    const personSourceIds = new Set(selectedPerson.sourceIds ?? []);
    return sources.filter(
      (source) =>
        personSourceIds.has(source.id) || source.linkedPersonIds.includes(selectedPerson.id),
    );
  }, [selectedPerson, sources]);
  const filteredPeople = useMemo(
    () => visiblePeople(people, query, vitalFilter, wellbeingFilter),
    [people, query, vitalFilter, wellbeingFilter],
  );
  const familyMetrics = useMemo(() => metrics(people), [people]);
  const qualityIssues = useMemo(() => buildQualityIssues(people, sources), [people, sources]);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const commitPeople = (nextPeople: Person[], selectedPersonId = store.selectedPersonId) => {
    setStore((current) => ({
      ...current,
      people: normalizeRelationshipLinks(nextPeople),
      selectedPersonId,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handlePersonChange = <K extends keyof Person>(key: K, value: Person[K]) => {
    if (!selectedPerson) return;
    const next = { ...selectedPerson, [key]: value };
    commitPeople(updatePerson(people, next), selectedPerson.id);
  };

  const handleAddRelative = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPerson) return;
    const result = addRelative(people, selectedPerson.id, relationshipDraft);
    commitPeople(result.people, result.newPersonId);
    setRelationshipDraft(emptyRelationshipDraft);
  };

  const handleAddEvent = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPerson || !eventDraft.title.trim()) return;
    commitPeople(addEvent(people, selectedPerson.id, eventDraft), selectedPerson.id);
    setEventDraft(emptyEventDraft);
  };

  const handleAddSource = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPerson || !sourceDraft.title.trim()) return;
    const newSource: SourceRecord = {
      ...sourceDraft,
      id: makeSourceId(),
      linkedPersonIds: [selectedPerson.id],
      addedAt: new Date().toISOString(),
    };
    const nextPeople = people.map((person) =>
      person.id === selectedPerson.id
        ? {
            ...person,
            sourceIds: Array.from(new Set([...(person.sourceIds ?? []), newSource.id])),
          }
        : person,
    );

    setStore((current) => ({
      ...current,
      people: normalizeRelationshipLinks(nextPeople),
      sources: [...sources, newSource],
      updatedAt: new Date().toISOString(),
    }));
    setSourceDraft(emptySourceDraft);
  };

  const handleAddMemory = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPerson || !memoryDraft.title.trim()) return;
    const newMemory: MemoryItem = {
      ...memoryDraft,
      id: makeMemoryId(),
    };
    const nextPeople = people.map((person) =>
      person.id === selectedPerson.id
        ? {
            ...person,
            memories: [newMemory, ...(person.memories ?? [])],
          }
        : person,
    );

    commitPeople(nextPeople, selectedPerson.id);
    setMemoryDraft(emptyMemoryDraft);
  };

  const handleDeletePerson = () => {
    if (!selectedPerson || people.length <= 1) return;
    const confirmed = window.confirm(
      `Delete ${getFullName(selectedPerson)} from this family tree? This removes their links from relatives and sources.`,
    );
    if (!confirmed) return;

    const nextPeople = removePerson(people, selectedPerson.id);
    setStore((current) => ({
      ...current,
      people: normalizeRelationshipLinks(nextPeople),
      sources: sources
        .map((source) => ({
          ...source,
          linkedPersonIds: source.linkedPersonIds.filter((id) => id !== selectedPerson.id),
        }))
        .filter((source) => source.linkedPersonIds.length > 0),
      selectedPersonId: nextPeople[0]?.id ?? "",
      updatedAt: new Date().toISOString(),
    }));
  };

  const exportJson = (publicOnly = false) => {
    const exportStore = publicOnly
      ? createPublicExport({ ...store, sources }, people)
      : { ...store, people, sources };
    const payload = JSON.stringify(exportStore, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const scope = publicOnly ? "public" : "private";
    anchor.download = `giapha-family-state-${scope}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as FamilyStore;
    if (!Array.isArray(parsed.people) || parsed.people.length === 0) {
      throw new Error("Imported file must contain a people array.");
    }
    setStore(
      normalizeStore({
        ...parsed,
        sources: parsed.sources ?? [],
        selectedPersonId: parsed.selectedPersonId || parsed.people[0].id,
        updatedAt: new Date().toISOString(),
      }),
    );
    event.target.value = "";
  };

  const resetDemo = () => {
    setStore(seedStore);
    setQuery("");
    setVitalFilter("all");
    setWellbeingFilter("all");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Family state workspace</p>
          <h1>Giapha</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={resetDemo} title="Reset demo data" type="button">
            <RotateCcw aria-hidden="true" size={18} />
          </button>
          <button className="command-button" onClick={() => exportJson(false)} type="button">
            <FileDown aria-hidden="true" size={18} />
            Export
          </button>
          <button className="command-button" onClick={() => exportJson(true)} type="button">
            <LockKeyhole aria-hidden="true" size={18} />
            Public export
          </button>
          <button
            className="command-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <FileUp aria-hidden="true" size={18} />
            Import
          </button>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="application/json,.json"
            onChange={importJson}
          />
        </div>
      </header>

      <section className="metrics-grid" aria-label="Family metrics">
        <Metric icon={<UsersRound size={18} />} label="Profiles" value={familyMetrics.total} />
        <Metric icon={<HeartPulse size={18} />} label="Living" value={familyMetrics.living} />
        <Metric icon={<Activity size={18} />} label="Watch list" value={familyMetrics.attention} />
        <Metric icon={<Shield size={18} />} label="Private" value={familyMetrics.private} />
        <Metric icon={<Upload size={18} />} label="Needs source" value={familyMetrics.needsSource} />
        <Metric icon={<AlertTriangle size={18} />} label="Review" value={qualityIssues.length} />
      </section>

      <div className="workspace">
        <aside className="left-rail" aria-label="Family search and filters">
          <div className="panel-title">
            <Search aria-hidden="true" size={18} />
            Find people
          </div>
          <label className="field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, tag, place..."
            />
          </label>
          <label className="field">
            <span>Life status</span>
            <select value={vitalFilter} onChange={(event) => setVitalFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="living">Living</option>
              <option value="deceased">Deceased</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="field">
            <span>Wellbeing</span>
            <select
              value={wellbeingFilter}
              onChange={(event) => setWellbeingFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="thriving">Thriving</option>
              <option value="stable">Stable</option>
              <option value="needs-attention">Needs attention</option>
              <option value="critical">Critical</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <QualityPanel
            issues={qualityIssues}
            peopleById={peopleById}
            onSelect={(personId) =>
              setStore((current) => ({ ...current, selectedPersonId: personId }))
            }
          />

          <div className="people-list" aria-label="Filtered people">
            {filteredPeople.map((person) => (
              <button
                className={`person-row ${person.id === selectedPerson?.id ? "selected" : ""}`}
                key={person.id}
                onClick={() => setStore((current) => ({ ...current, selectedPersonId: person.id }))}
                type="button"
              >
                <span className={`avatar gender-${person.gender}`}>
                  {getInitials(person)}
                  <span className={`state-dot ${person.wellbeing}`} aria-hidden="true" />
                </span>
                <span>
                  <strong>{getFullName(person)}</strong>
                  <small>{person.location || "Location unknown"}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="tree-panel" aria-label="Family tree">
          <div className="panel-title">
            <UsersRound aria-hidden="true" size={18} />
            Tree view
          </div>
          <FamilyTree
            people={filteredPeople}
            allPeople={people}
            selectedPersonId={selectedPerson?.id ?? ""}
            onSelect={(personId) =>
              setStore((current) => ({ ...current, selectedPersonId: personId }))
            }
          />
        </section>

        <aside className="inspector" aria-label="Selected person details">
          {selectedPerson ? (
            <>
              <section className="profile-head">
                <div className={`profile-avatar gender-${selectedPerson.gender}`}>
                  {getInitials(selectedPerson)}
                  <span
                    className={`state-dot large ${selectedPerson.wellbeing}`}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="eyebrow">{selectedPerson.nickname || "Selected profile"}</p>
                  <h2>{getFullName(selectedPerson)}</h2>
                  <p className="profile-meta">
                    {calculateAge(selectedPerson) ?? "Age unknown"} years
                    {selectedPerson.location ? ` · ${selectedPerson.location}` : ""}
                  </p>
                </div>
              </section>

              <section className="relation-strip" aria-label="Close relatives">
                <RelationGroup
                  label="Parents"
                  ids={selectedPerson.parents}
                  peopleById={peopleById}
                  onSelect={(personId) =>
                    setStore((current) => ({ ...current, selectedPersonId: personId }))
                  }
                />
                <RelationGroup
                  label="Partners"
                  ids={selectedPerson.partners}
                  peopleById={peopleById}
                  onSelect={(personId) =>
                    setStore((current) => ({ ...current, selectedPersonId: personId }))
                  }
                />
                <RelationGroup
                  label="Children"
                  ids={selectedPerson.children}
                  peopleById={peopleById}
                  onSelect={(personId) =>
                    setStore((current) => ({ ...current, selectedPersonId: personId }))
                  }
                />
              </section>

              <section className="editor-section">
                <div className="section-heading">
                  <Save aria-hidden="true" size={18} />
                  Profile
                </div>
                <div className="form-grid two">
                  <label className="field">
                    <span>Given name</span>
                    <input
                      value={selectedPerson.givenName}
                      onChange={(event) => handlePersonChange("givenName", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Family name</span>
                    <input
                      value={selectedPerson.familyName}
                      onChange={(event) => handlePersonChange("familyName", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Nickname</span>
                    <input
                      value={selectedPerson.nickname ?? ""}
                      onChange={(event) => handlePersonChange("nickname", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Birth date</span>
                    <input
                      value={selectedPerson.birthDate ?? ""}
                      onChange={(event) => handlePersonChange("birthDate", event.target.value)}
                      type="date"
                    />
                  </label>
                  <label className="field">
                    <span>Death date</span>
                    <input
                      value={selectedPerson.deathDate ?? ""}
                      onChange={(event) => handlePersonChange("deathDate", event.target.value)}
                      type="date"
                    />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select
                      value={selectedPerson.gender}
                      onChange={(event) =>
                        handlePersonChange("gender", event.target.value as Person["gender"])
                      }
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="nonbinary">Nonbinary</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Vital status</span>
                    <select
                      value={selectedPerson.vitalStatus}
                      onChange={(event) =>
                        handlePersonChange("vitalStatus", event.target.value as VitalStatus)
                      }
                    >
                      {Object.entries(vitalLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Wellbeing</span>
                    <select
                      value={selectedPerson.wellbeing}
                      onChange={(event) =>
                        handlePersonChange("wellbeing", event.target.value as WellbeingState)
                      }
                    >
                      {Object.entries(wellbeingLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Contact</span>
                    <select
                      value={selectedPerson.contactState}
                      onChange={(event) =>
                        handlePersonChange("contactState", event.target.value as ContactState)
                      }
                    >
                      {Object.entries(contactLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Privacy</span>
                    <select
                      value={selectedPerson.privacy}
                      onChange={(event) =>
                        handlePersonChange(
                          "privacy",
                          event.target.value as Person["privacy"],
                        )
                      }
                    >
                      <option value="shared">Shared</option>
                      <option value="family">Family</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span>Occupation</span>
                    <input
                      value={selectedPerson.occupation ?? ""}
                      onChange={(event) => handlePersonChange("occupation", event.target.value)}
                    />
                  </label>
                  <label className="field full">
                    <span>Location</span>
                    <input
                      value={selectedPerson.location ?? ""}
                      onChange={(event) => handlePersonChange("location", event.target.value)}
                    />
                  </label>
                  <label className="field full">
                    <span>Tags</span>
                    <input
                      value={selectedPerson.tags.join(", ")}
                      onChange={(event) =>
                        handlePersonChange(
                          "tags",
                          event.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </label>
                  <label className="field full">
                    <span>Notes</span>
                    <textarea
                      value={selectedPerson.notes}
                      onChange={(event) => handlePersonChange("notes", event.target.value)}
                      rows={4}
                    />
                  </label>
                </div>
              </section>

              <section className="editor-section">
                <div className="section-heading">
                  <BookOpen aria-hidden="true" size={18} />
                  Sources
                </div>
                <form className="compact-form" onSubmit={handleAddSource}>
                  <div className="form-grid two">
                    <label className="field full">
                      <span>Source title</span>
                      <input
                        value={sourceDraft.title}
                        onChange={(event) =>
                          setSourceDraft((draft) => ({ ...draft, title: event.target.value }))
                        }
                        placeholder="Birth record, interview, archive note..."
                      />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={sourceDraft.type}
                        onChange={(event) =>
                          setSourceDraft((draft) => ({
                            ...draft,
                            type: event.target.value as SourceType,
                          }))
                        }
                      >
                        {Object.entries(sourceTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Confidence</span>
                      <select
                        value={sourceDraft.confidence}
                        onChange={(event) =>
                          setSourceDraft((draft) => ({
                            ...draft,
                            confidence: event.target.value as SourceRecord["confidence"],
                          }))
                        }
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="likely">Likely</option>
                        <option value="needs-source">Needs source</option>
                      </select>
                    </label>
                    <label className="field full">
                      <span>URL or archive path</span>
                      <input
                        value={sourceDraft.url ?? ""}
                        onChange={(event) =>
                          setSourceDraft((draft) => ({ ...draft, url: event.target.value }))
                        }
                        placeholder="https://... or shelf / box / folder"
                      />
                    </label>
                    <label className="field full">
                      <span>Source note</span>
                      <textarea
                        value={sourceDraft.note}
                        onChange={(event) =>
                          setSourceDraft((draft) => ({ ...draft, note: event.target.value }))
                        }
                        rows={3}
                      />
                    </label>
                  </div>
                  <button className="command-button full-button" type="submit">
                    <Link2 aria-hidden="true" size={18} />
                    Link source
                  </button>
                </form>

                <div className="evidence-list">
                  {selectedSources.length > 0 ? (
                    selectedSources.map((source) => (
                      <article className="evidence-item" key={source.id}>
                        <div>
                          <strong>{source.title}</strong>
                          <small>
                            {sourceTypeLabels[source.type]} · {source.confidence}
                          </small>
                        </div>
                        {source.note ? <p>{source.note}</p> : null}
                        {source.url && isWebLink(source.url) ? (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            <ExternalLink aria-hidden="true" size={14} />
                            Open source
                          </a>
                        ) : source.url ? (
                          <span className="meta-chip">
                            <BookOpen aria-hidden="true" size={14} />
                            {source.url}
                          </span>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="empty-note">No source linked yet.</p>
                  )}
                </div>
              </section>

              <section className="editor-section">
                <div className="section-heading">
                  <Image aria-hidden="true" size={18} />
                  Memories
                </div>
                <form className="compact-form" onSubmit={handleAddMemory}>
                  <div className="form-grid two">
                    <label className="field full">
                      <span>Memory title</span>
                      <input
                        value={memoryDraft.title}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({ ...draft, title: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={memoryDraft.type}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({
                            ...draft,
                            type: event.target.value as MemoryType,
                          }))
                        }
                      >
                        {Object.entries(memoryTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Privacy</span>
                      <select
                        value={memoryDraft.privacy}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({
                            ...draft,
                            privacy: event.target.value as MemoryItem["privacy"],
                          }))
                        }
                      >
                        <option value="shared">Shared</option>
                        <option value="family">Family</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Date</span>
                      <input
                        value={memoryDraft.date ?? ""}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({ ...draft, date: event.target.value }))
                        }
                        type="date"
                      />
                    </label>
                    <label className="field">
                      <span>Link</span>
                      <input
                        value={memoryDraft.url ?? ""}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({ ...draft, url: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Memory note</span>
                      <textarea
                        value={memoryDraft.note}
                        onChange={(event) =>
                          setMemoryDraft((draft) => ({ ...draft, note: event.target.value }))
                        }
                        rows={3}
                      />
                    </label>
                  </div>
                  <button className="command-button full-button" type="submit">
                    <Plus aria-hidden="true" size={18} />
                    Add memory
                  </button>
                </form>

                <div className="evidence-list">
                  {(selectedPerson.memories ?? []).length > 0 ? (
                    (selectedPerson.memories ?? []).map((memory) => (
                      <article className="evidence-item" key={memory.id}>
                        <div>
                          <strong>{memory.title}</strong>
                          <small>
                            {memoryTypeLabels[memory.type]} · {memory.privacy}
                            {memory.date ? ` · ${formatDate(memory.date)}` : ""}
                          </small>
                        </div>
                        {memory.note ? <p>{memory.note}</p> : null}
                        {memory.url && isWebLink(memory.url) ? (
                          <a href={memory.url} target="_blank" rel="noreferrer">
                            <ExternalLink aria-hidden="true" size={14} />
                            Open memory
                          </a>
                        ) : memory.url ? (
                          <span className="meta-chip">
                            <Image aria-hidden="true" size={14} />
                            {memory.url}
                          </span>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="empty-note">No memory added yet.</p>
                  )}
                </div>
              </section>

              <section className="editor-section">
                <div className="section-heading">
                  <UserRoundPlus aria-hidden="true" size={18} />
                  Add relative
                </div>
                <form className="compact-form" onSubmit={handleAddRelative}>
                  <div className="form-grid two">
                    <label className="field">
                      <span>Relation</span>
                      <select
                        value={relationshipDraft.relation}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            relation: event.target.value as RelationshipDraft["relation"],
                          }))
                        }
                      >
                        <option value="parent">Parent</option>
                        <option value="partner">Partner</option>
                        <option value="child">Child</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Life status</span>
                      <select
                        value={relationshipDraft.vitalStatus}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            vitalStatus: event.target.value as VitalStatus,
                          }))
                        }
                      >
                        {Object.entries(vitalLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Gender</span>
                      <select
                        value={relationshipDraft.gender}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            gender: event.target.value as Person["gender"],
                          }))
                        }
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="nonbinary">Nonbinary</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Wellbeing</span>
                      <select
                        value={relationshipDraft.wellbeing}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            wellbeing: event.target.value as WellbeingState,
                          }))
                        }
                      >
                        {Object.entries(wellbeingLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Given name</span>
                      <input
                        value={relationshipDraft.givenName}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            givenName: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Family name</span>
                      <input
                        value={relationshipDraft.familyName}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            familyName: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Location</span>
                      <input
                        value={relationshipDraft.location}
                        onChange={(event) =>
                          setRelationshipDraft((draft) => ({
                            ...draft,
                            location: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <button className="command-button full-button" type="submit">
                    <Plus aria-hidden="true" size={18} />
                    Add relative
                  </button>
                </form>
              </section>

              <section className="editor-section">
                <div className="section-heading">
                  <CalendarClock aria-hidden="true" size={18} />
                  State timeline
                </div>
                <form className="compact-form" onSubmit={handleAddEvent}>
                  <div className="form-grid two">
                    <label className="field">
                      <span>Date</span>
                      <input
                        value={eventDraft.date}
                        onChange={(event) =>
                          setEventDraft((draft) => ({ ...draft, date: event.target.value }))
                        }
                        type="date"
                      />
                    </label>
                    <label className="field">
                      <span>Type</span>
                      <select
                        value={eventDraft.type}
                        onChange={(event) =>
                          setEventDraft((draft) => ({
                            ...draft,
                            type: event.target.value as EventType,
                          }))
                        }
                      >
                        {Object.entries(eventTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field full">
                      <span>Title</span>
                      <input
                        value={eventDraft.title}
                        onChange={(event) =>
                          setEventDraft((draft) => ({ ...draft, title: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field full">
                      <span>Note</span>
                      <textarea
                        value={eventDraft.note}
                        onChange={(event) =>
                          setEventDraft((draft) => ({ ...draft, note: event.target.value }))
                        }
                        rows={3}
                      />
                    </label>
                    <label className="field">
                      <span>Location</span>
                      <input
                        value={eventDraft.location ?? ""}
                        onChange={(event) =>
                          setEventDraft((draft) => ({ ...draft, location: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Confidence</span>
                      <select
                        value={eventDraft.confidence}
                        onChange={(event) =>
                          setEventDraft((draft) => ({
                            ...draft,
                            confidence: event.target.value as FamilyEvent["confidence"],
                          }))
                        }
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="likely">Likely</option>
                        <option value="needs-source">Needs source</option>
                      </select>
                    </label>
                  </div>
                  <button className="command-button full-button" type="submit">
                    <Download aria-hidden="true" size={18} />
                    Log state
                  </button>
                </form>

                <div className="timeline">
                  {selectedPerson.events.map((event) => (
                    <article className="timeline-item" key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <small>
                          {formatDate(event.date)} · {eventTypeLabels[event.type]} ·{" "}
                          {event.confidence}
                        </small>
                      </div>
                      <p>{event.note}</p>
                      {event.location ? (
                        <span className="meta-chip">
                          <MapPin aria-hidden="true" size={14} />
                          {event.location}
                        </span>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <button className="danger-button" type="button" onClick={handleDeletePerson}>
                <Trash2 aria-hidden="true" size={18} />
                Delete selected profile
              </button>
            </>
          ) : (
            <p>No profile selected.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function RelationGroup({
  label,
  ids,
  peopleById,
  onSelect,
}: {
  label: string;
  ids: string[];
  peopleById: Map<string, Person>;
  onSelect: (personId: string) => void;
}) {
  const relatives = ids.map((id) => peopleById.get(id)).filter((person): person is Person => !!person);

  return (
    <div className="relation-group">
      <strong>{label}</strong>
      {relatives.length > 0 ? (
        <div className="relation-pills">
          {relatives.map((person) => (
            <button key={person.id} type="button" onClick={() => onSelect(person.id)}>
              {getFullName(person)}
            </button>
          ))}
        </div>
      ) : (
        <small>Unknown</small>
      )}
    </div>
  );
}

function QualityPanel({
  issues,
  peopleById,
  onSelect,
}: {
  issues: QualityIssue[];
  peopleById: Map<string, Person>;
  onSelect: (personId: string) => void;
}) {
  const visibleIssues = issues.slice(0, 6);

  return (
    <section className="quality-panel" aria-label="Problem spotter">
      <div className="quality-heading">
        <AlertTriangle aria-hidden="true" size={16} />
        <strong>Problem spotter</strong>
        <span>{issues.length}</span>
      </div>
      {visibleIssues.length > 0 ? (
        <div className="quality-list">
          {visibleIssues.map((issue, index) => {
            const person = peopleById.get(issue.personId);
            return (
              <button
                className={`quality-issue ${issue.severity}`}
                key={`${issue.personId}-${issue.title}-${index}`}
                onClick={() => onSelect(issue.personId)}
                type="button"
              >
                <strong>{issue.title}</strong>
                <small>
                  {person ? getFullName(person) : "Unknown person"} · {issue.detail}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="empty-note">No data-quality issues found.</p>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function buildQualityIssues(people: Person[], sources: SourceRecord[]): QualityIssue[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const sourceIds = new Set(sources.map((source) => source.id));
  const sourcedPersonIds = new Set(
    sources.flatMap((source) => source.linkedPersonIds).filter(Boolean),
  );
  const issues: QualityIssue[] = [];
  const now = new Date();

  for (const person of people) {
    const name = getFullName(person) || "This person";
    const hasSource =
      (person.sourceIds ?? []).some((sourceId) => sourceIds.has(sourceId)) ||
      sourcedPersonIds.has(person.id);

    if (!person.birthDate) {
      issues.push({
        personId: person.id,
        severity: "warning",
        title: "Missing birth date",
        detail: `${name} has no birth date.`,
      });
    }

    if (person.deathDate && person.vitalStatus === "living") {
      issues.push({
        personId: person.id,
        severity: "risk",
        title: "Status mismatch",
        detail: "Death date exists while status is Living.",
      });
    }

    if (person.vitalStatus === "deceased" && !person.deathDate) {
      issues.push({
        personId: person.id,
        severity: "warning",
        title: "Missing death date",
        detail: "Marked deceased without a death date.",
      });
    }

    if (!hasSource) {
      issues.push({
        personId: person.id,
        severity: "info",
        title: "No linked source",
        detail: "Add at least one record, interview, or document.",
      });
    }

    const needsSource = person.events.filter((event) => event.confidence === "needs-source");
    if (needsSource.length > 0) {
      issues.push({
        personId: person.id,
        severity: "info",
        title: "Event needs source",
        detail: `${needsSource.length} timeline event${needsSource.length > 1 ? "s" : ""} need evidence.`,
      });
    }

    if (["needs-attention", "critical"].includes(person.wellbeing)) {
      const latestStateEvent = person.events
        .filter((event) => ["health", "status"].includes(event.type))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const lastStateDate = latestStateEvent ? new Date(`${latestStateEvent.date}T00:00:00`) : null;
      const daysSinceState =
        lastStateDate && !Number.isNaN(lastStateDate.getTime())
          ? Math.floor((now.getTime() - lastStateDate.getTime()) / 86_400_000)
          : Number.POSITIVE_INFINITY;

      if (daysSinceState > 120) {
        issues.push({
          personId: person.id,
          severity: person.wellbeing === "critical" ? "risk" : "warning",
          title: "Stale state check",
          detail: "Wellbeing needs a recent health or status event.",
        });
      }
    }

    for (const parentId of person.parents) {
      const parent = peopleById.get(parentId);
      if (!parent?.birthDate || !person.birthDate) continue;
      const parentAge = yearOf(person.birthDate) - yearOf(parent.birthDate);
      if (parentAge < 12 || parentAge > 80) {
        issues.push({
          personId: person.id,
          severity: "risk",
          title: "Parent age check",
          detail: `${getFullName(parent)} would be ${parentAge} at birth.`,
        });
      }
    }
  }

  const severityRank = { risk: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function yearOf(date: string) {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : 0;
}

function isWebLink(value?: string) {
  return /^https?:\/\//i.test(value ?? "");
}

function FamilyTree({
  people,
  allPeople,
  selectedPersonId,
  onSelect,
}: {
  people: Person[];
  allPeople: Person[];
  selectedPersonId: string;
  onSelect: (personId: string) => void;
}) {
  const [zoom, setZoom] = useState(0.85);
  const generationMap = useMemo(() => getGenerations(allPeople), [allPeople]);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const grouped = useMemo(() => {
    const groups = new Map<number, Person[]>();
    for (const person of people) {
      const generation = generationMap.get(person.id) ?? 0;
      groups.set(generation, [...(groups.get(generation) ?? []), person]);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([generation, group]) => ({
        generation,
        people: group.sort((a, b) => getFullName(a).localeCompare(getFullName(b))),
      }));
  }, [generationMap, people]);

  const cardWidth = 190;
  const cardHeight = 92;
  const xGap = 52;
  const yGap = 86;
  const maxRow = Math.max(1, ...grouped.map((group) => group.people.length));
  const width = Math.max(720, maxRow * cardWidth + (maxRow - 1) * xGap + 96);
  const height = Math.max(420, grouped.length * cardHeight + (grouped.length - 1) * yGap + 96);
  const positions = new Map<string, { x: number; y: number }>();

  grouped.forEach((group, rowIndex) => {
    const rowWidth = group.people.length * cardWidth + Math.max(0, group.people.length - 1) * xGap;
    const startX = (width - rowWidth) / 2;
    const y = 48 + rowIndex * (cardHeight + yGap);
    group.people.forEach((person, index) => {
      positions.set(person.id, {
        x: startX + index * (cardWidth + xGap),
        y,
      });
    });
  });

  const parentEdges = people.flatMap((person) =>
    person.parents
      .filter((parentId) => peopleById.has(parentId))
      .map((parentId) => ({ from: parentId, to: person.id })),
  );
  const partnerEdges = people.flatMap((person) =>
    person.partners
      .filter((partnerId) => peopleById.has(partnerId) && person.id < partnerId)
      .map((partnerId) => ({ from: person.id, to: partnerId })),
  );

  if (people.length === 0) {
    return <div className="empty-state">No profiles match the current filters.</div>;
  }

  const zoomPercent = Math.round(zoom * 100);
  const setBoundedZoom = (nextZoom: number) => {
    setZoom(Math.min(1.5, Math.max(0.5, Number(nextZoom.toFixed(2)))));
  };

  return (
    <div className="tree-stage">
      <div className="tree-toolbar" aria-label="Tree zoom controls">
        <span className="tree-toolbar-label">Zoom</span>
        <button
          className="icon-button"
          onClick={() => setBoundedZoom(zoom - 0.1)}
          title="Zoom out"
          type="button"
        >
          <ZoomOut aria-hidden="true" size={17} />
        </button>
        <button
          className="icon-button"
          onClick={() => setBoundedZoom(zoom + 0.1)}
          title="Zoom in"
          type="button"
        >
          <ZoomIn aria-hidden="true" size={17} />
        </button>
        <button
          className="fit-button"
          onClick={() => setBoundedZoom(0.62)}
          title="Fit big picture"
          type="button"
        >
          <Maximize2 aria-hidden="true" size={17} />
          Fit
        </button>
        <button
          className="zoom-button"
          onClick={() => setBoundedZoom(0.85)}
          type="button"
          title="Reset zoom"
        >
          {zoomPercent}%
        </button>
      </div>
      <div className="tree-scroll">
      <svg
        className="tree-canvas"
        width={Math.round(width * zoom)}
        height={Math.round(height * zoom)}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Interactive family tree"
      >
        <defs>
          <marker
            id="child-dot"
            markerHeight="8"
            markerWidth="8"
            refX="4"
            refY="4"
            orient="auto"
          >
            <circle cx="4" cy="4" r="3" fill="#44605c" />
          </marker>
        </defs>
        {parentEdges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + cardWidth / 2;
          const y1 = from.y + cardHeight;
          const x2 = to.x + cardWidth / 2;
          const y2 = to.y;
          const midY = y1 + (y2 - y1) / 2;
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              className="tree-edge parent"
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              markerEnd="url(#child-dot)"
            />
          );
        })}
        {partnerEdges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const y = from.y + cardHeight / 2;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              className="tree-edge partner"
              x1={from.x + cardWidth}
              y1={y}
              x2={to.x}
              y2={y}
            />
          );
        })}
        {people.map((person) => {
          const position = positions.get(person.id);
          if (!position) return null;
          const age = calculateAge(person);
          return (
            <g
              className={`tree-card gender-${person.gender} ${
                person.id === selectedPersonId ? "selected" : ""
              }`}
              key={person.id}
              onClick={() => onSelect(person.id)}
              tabIndex={0}
              role="button"
              aria-label={`Select ${getFullName(person)}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelect(person.id);
                }
              }}
            >
              <rect
                className="tree-node-bg"
                x={position.x}
                y={position.y}
                rx="8"
                width={cardWidth}
                height={cardHeight}
              />
              <rect
                className="tree-gender-band"
                x={position.x}
                y={position.y}
                rx="8"
                width="8"
                height={cardHeight}
              />
              <circle
                className={`tree-avatar gender-${person.gender}`}
                cx={position.x + 34}
                cy={position.y + 34}
                r="20"
              />
              <circle
                className={`tree-state-dot ${person.wellbeing}`}
                cx={position.x + 49}
                cy={position.y + 49}
                r="6"
              />
              <text className="tree-initials" x={position.x + 34} y={position.y + 40}>
                {getInitials(person)}
              </text>
              <text className="tree-name" x={position.x + 64} y={position.y + 30}>
                {trimText(getFullName(person), 18)}
              </text>
              <text className="tree-sub" x={position.x + 64} y={position.y + 50}>
                {vitalLabels[person.vitalStatus]}{age !== null ? ` · ${age}` : ""}
              </text>
              <text className="tree-sub" x={position.x + 18} y={position.y + 76}>
                {trimText(
                  `${genderLabels[person.gender]} · ${wellbeingLabels[person.wellbeing]}`,
                  24,
                )}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </div>
  );
}

function trimText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export default App;
