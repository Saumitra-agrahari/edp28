import { create } from 'zustand';

export interface RfidTag {
  id: string;
  tagId: number | null;
  epc: string;
  alias: string | null;
  icon: string;
  isActive: boolean;
}

export interface TagReading {
  epc: string;
  rssi: number | null;
  lastSeenAt: string | null;
  status: 'IN_BAG' | 'MISSING' | 'UNKNOWN';
}

export interface UnknownTag {
  epc: string;
  tag_id: number | null;
  tagId?: number | null;
}

interface RfidState {
  tags: RfidTag[];
  readings: Record<string, TagReading>; // Keyed by EPC
  unknownTags: UnknownTag[];
  isLoading: boolean;
  setTags: (tags: RfidTag[]) => void;
  setUnknownTags: (tags: UnknownTag[]) => void;
  updateReading: (reading: TagReading) => void;
  updateMultipleReadings: (readings: TagReading[]) => void;
  clearReadings: () => void;
}

export const useRfidStore = create<RfidState>((set) => ({
  tags: [],
  readings: {},
  unknownTags: [],
  isLoading: false,
  
  setTags: (tags) =>
    set({
      tags: tags.map((tag) => ({
        ...tag,
        id: String(tag.id),
        tagId: typeof tag.tagId === 'number' ? tag.tagId : tag.tagId ?? null,
        epc: String(tag.epc).trim().toUpperCase(),
      })),
    }),
  setUnknownTags: (unknownTags) => set({ unknownTags: unknownTags.map((tag) => ({ ...tag, tagId: tag.tagId ?? tag.tag_id ?? null })) }),
  
  updateReading: (reading) => 
    set((state) => ({
      readings: {
        ...state.readings,
        [String(reading.epc).trim().toUpperCase()]: {
          ...reading,
          epc: String(reading.epc).trim().toUpperCase(),
        },
      }
    })),
    
  updateMultipleReadings: (newReadings) =>
    set((state) => {
      const updatedReadings = { ...state.readings };
      newReadings.forEach(r => {
        const normalizedEpc = String(r.epc).trim().toUpperCase();
        updatedReadings[normalizedEpc] = { ...r, epc: normalizedEpc };
      });
      return { readings: updatedReadings };
    }),
    
  clearReadings: () => set({ readings: {} }),
}));
