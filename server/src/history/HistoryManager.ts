import fs from 'fs';
import path from 'path';
import { HistoryRecord } from '../types/index.js';

export class HistoryManager {
  private filePath: string;
  private enabled: boolean;
  private records: HistoryRecord[] = [];

  constructor(storageDir: string, enabled = true) {
    this.filePath = path.join(storageDir, 'transfer_history.json');
    this.enabled = enabled;
    this.loadHistory();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // If disabled, user might not want old history kept, but we preserve existing until cleared or keep it inactive
    }
  }

  private loadHistory(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.records = data;
        }
      }
    } catch (err) {
      console.error('Failed to load transfer history, initializing empty list:', err);
      this.records = [];
    }
  }

  private saveHistory(): void {
    if (!this.enabled) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save transfer history:', err);
    }
  }

  public addRecord(record: HistoryRecord): void {
    if (!this.enabled) return;

    // Prepend new record so newest is first
    this.records.unshift(record);

    // Limit to 500 records max in memory to prevent memory bloat
    if (this.records.length > 500) {
      this.records = this.records.slice(0, 500);
    }

    this.saveHistory();
  }

  public getRecords(limit = 100, offset = 0): { records: HistoryRecord[]; total: number } {
    return {
      records: this.records.slice(offset, offset + limit),
      total: this.records.length,
    };
  }

  public clearHistory(): void {
    this.records = [];
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch (err) {
      console.error('Failed to clear history file:', err);
    }
  }
}
