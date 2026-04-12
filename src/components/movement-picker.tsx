"use client";

import { useState, useRef, useEffect } from "react";
import { createMovement } from "@/app/actions";
import { toast } from "sonner";
import type { MovementCategory } from "@/db/schema";

interface Movement {
  id: number;
  name: string;
  category: string;
}

interface MovementPickerProps {
  movements: Movement[];
  value: string;
  onChange: (name: string) => void;
  onMovementAdded?: (m: Movement) => void;
  filterCategory?: string;
  placeholder?: string;
}

export function MovementPicker({
  movements,
  value,
  onChange,
  onMovementAdded,
  filterCategory,
  placeholder = "Search movements...",
}: MovementPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<MovementCategory>(
    (filterCategory as MovementCategory) || "STRENGTH"
  );
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAddForm(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = movements.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (!filterCategory) return matchesSearch;
    const categoryMap: Record<string, string[]> = {
      "OLYMPIC LIFT": ["OLYMPIC"],
      "WARM UP": ["WARM UP", "CONDITIONING"],
      PRIMER: ["OLYMPIC", "STRENGTH", "ACCESSORY", "WARM UP"],
      "STRENGTH 1": ["STRENGTH", "OLYMPIC"],
      "STRENGTH 2": ["STRENGTH", "ACCESSORY"],
      "STRENGTH 3": ["STRENGTH", "ACCESSORY"],
      ACCESSORY: ["ACCESSORY", "CONDITIONING"],
      "COOL DOWN": ["WARM UP", "CONDITIONING", "ACCESSORY"],
      STRENGTH: ["STRENGTH", "OLYMPIC", "ACCESSORY"],
      SKILL: ["GYMNASTICS", "OLYMPIC", "ACCESSORY"],
      "HEAVY DAY": ["STRENGTH", "OLYMPIC"],
      "LOADING UP": ["OLYMPIC", "STRENGTH"],
      WOD: ["STRENGTH", "OLYMPIC", "GYMNASTICS", "CONDITIONING", "ACCESSORY", "WARM UP"],
      "ON RAMP": ["STRENGTH", "OLYMPIC", "GYMNASTICS", "CONDITIONING", "ACCESSORY", "WARM UP"],
    };
    const allowed = categoryMap[filterCategory] || [];
    return matchesSearch && (allowed.length === 0 || allowed.includes(m.category));
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const m = await createMovement(newName.trim(), newCategory);
      toast.success(`${m.name} added`);
      onChange(m.name);
      onMovementAdded?.(m);
      setShowAddForm(false);
      setNewName("");
      setOpen(false);
    } catch {
      toast.error("Failed to add movement");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-surface-container px-3 py-2 text-left font-headline text-sm font-bold uppercase text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <span className={value ? "" : "text-outline"}>
          {value || placeholder}
        </span>
        <span className="material-symbols-outlined text-sm text-outline">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-64 overflow-y-auto bg-surface-container-highest shadow-lg">
          <div className="sticky top-0 bg-surface-container-highest p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter..."
              className="w-full bg-surface-container px-3 py-2 text-xs text-on-surface outline-none placeholder:text-outline"
            />
          </div>

          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.name);
                setOpen(false);
                setSearch("");
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-surface-bright ${
                m.name === value ? "bg-primary-container/20 text-primary" : "text-on-surface"
              }`}
            >
              <span className="font-bold uppercase">{m.name}</span>
              <span className="text-[9px] tracking-widest text-outline">
                {m.category}
              </span>
            </button>
          ))}

          {filtered.length === 0 && !showAddForm && (
            <p className="px-3 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-outline">
              NO MATCHES
            </p>
          )}

          {!showAddForm ? (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(true);
                setNewName(search);
              }}
              className="flex w-full items-center gap-2 border-t border-outline-variant px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-surface-bright"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              ADD NEW MOVEMENT
            </button>
          ) : (
            <div className="border-t border-outline-variant p-3">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Movement name"
                className="mb-2 w-full bg-surface-container px-3 py-2 text-xs font-bold uppercase text-on-surface outline-none placeholder:text-outline"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MovementCategory)}
                className="mb-2 w-full bg-surface-container px-3 py-2 text-xs font-bold uppercase text-on-surface outline-none"
              >
                <option value="OLYMPIC">OLYMPIC</option>
                <option value="STRENGTH">STRENGTH</option>
                <option value="ACCESSORY">ACCESSORY</option>
                <option value="WARM UP">WARM UP</option>
                <option value="CONDITIONING">CONDITIONING</option>
                <option value="GYMNASTICS">GYMNASTICS</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                  className="flex-1 bg-primary-container py-2 text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed disabled:opacity-50"
                >
                  {adding ? "..." : "ADD"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-surface-variant px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
