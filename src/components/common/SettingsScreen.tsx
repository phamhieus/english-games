import { useState } from 'react';
import { DatabaseBackup, Shirt, Upload, Volume2 } from 'lucide-react';
import type { AppSettings, RecallAnnounce } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';
import { speech } from '@/services/speech/speech';
import { sfx } from '@/services/audio/sfx';
import { exportBackup, importBackup, parseBackup, type BackupFile } from '@/services/database/backup';
import { downloadBlob } from '@/services/import/spreadsheet';
import { skinById } from '@/game/config/theme';
import { useAppStore } from '@/stores/appStore';
import { CannonPreview } from './CannonPreview';
import { BrandTitle } from './Art';
import { inputCls, Button, Card, ConfirmDialog, Segmented, Toggle } from './ui';

export function SettingsScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const navigate = useAppStore((s) => s.navigate);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const speechAvailable = speech.available;

  const doExport = async () => {
    const data = await exportBackup();
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(JSON.stringify(data), `word-shooter-backup-${date}.json`, 'application/json');
  };

  const onRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPendingRestore(parseBackup(await file.text()));
      setBackupMsg(null);
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : 'Invalid backup file.');
    }
  };

  const restore = async (mode: 'merge' | 'replace') => {
    if (!pendingRestore) return;
    try {
      await importBackup(pendingRestore, mode);
      setBackupMsg(`Restored ${pendingRestore.vocabulary.length} words and ${pendingRestore.sessions.length} sessions.`);
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : 'Restore failed.');
    }
    setPendingRestore(null);
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <h1 className="text-4xl">
        <BrandTitle>Game settings</BrandTitle>
      </h1>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Appearance</h2>
        <p className="mb-3 text-sm text-ink-soft">Dark is easier on the eyes, especially in the evening.</p>
        <Segmented<AppSettings['theme']>
          label="Theme"
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'Same as device' },
          ]}
        />
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Sound</h2>
        <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
        <label className="flex items-center gap-3 py-2">
          <span className="w-28 font-semibold">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.sfxVolume}
            disabled={!settings.soundEnabled}
            onChange={(e) => update({ sfxVolume: Number(e.target.value) })}
            onPointerUp={() => sfx.play('pop')}
            className="flex-1 accent-candy-purple"
          />
        </label>
        <Toggle
          label="Background music"
          description="A cheerful tune for the menus and a different one for every stage."
          checked={settings.musicEnabled}
          onChange={(musicEnabled) => update({ musicEnabled })}
        />
        <label className="flex items-center gap-3 py-2">
          <span className="w-28 font-semibold">Music volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            disabled={!settings.musicEnabled}
            onChange={(e) => update({ musicVolume: Number(e.target.value) })}
            className="flex-1 accent-candy-purple"
          />
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Voice & pronunciation</h2>
        {!speechAvailable && (
          <p className="mb-2 rounded-xl bg-candy-sun/40 px-3 py-2 text-sm">Speech isn’t available in this browser — the game works fine without it.</p>
        )}
        <Toggle label="Pronunciation" description="Use the browser’s voice to read words." checked={settings.speechEnabled} onChange={(speechEnabled) => update({ speechEnabled })} />
        <Toggle
          label="Read each word before its balloon appears"
          description="Hear the word, then see the balloon float in."
          checked={settings.announceBeforeSpawn}
          onChange={(announceBeforeSpawn) => update({ announceBeforeSpawn })}
        />
        <div className="py-2">
          <div className="mb-1 font-semibold">In Vietnamese → English and Mistake modes, read…</div>
          <p className="mb-2 text-sm text-ink-soft">Reading the English word gives the answer away (it becomes listening practice).</p>
          <Segmented<RecallAnnounce>
            label="What to read in recall modes"
            value={settings.recallAnnounce}
            onChange={(recallAnnounce) => update({ recallAnnounce })}
            options={[
              { value: 'vietnamese', label: 'Vietnamese prompt' },
              { value: 'english', label: 'English word' },
              { value: 'off', label: 'Nothing' },
            ]}
          />
          {settings.recallAnnounce === 'vietnamese' && speechAvailable && !speech.hasVoice('vi') && (
            <p className="mt-2 text-sm text-ink-soft">No Vietnamese voice found on this device, so prompts will be silent.</p>
          )}
        </div>
        <Toggle label="Say the English word after a correct hit" checked={settings.speakOnCorrect} onChange={(speakOnCorrect) => update({ speakOnCorrect })} />
        <label className="flex items-center gap-3 py-2">
          <span className="w-28 font-semibold">Speed</span>
          <input
            type="range"
            min={0.5}
            max={1.3}
            step={0.05}
            value={settings.speechRate}
            onChange={(e) => update({ speechRate: Number(e.target.value) })}
            className="flex-1 accent-candy-purple"
          />
          <span className="w-12 text-right tabular-nums">{settings.speechRate.toFixed(2)}×</span>
          <Button size="sm" icon={<Volume2 size={16} />} onClick={() => speech.speak('environment', { rate: settings.speechRate })} aria-label="Test voice">
            Test
          </Button>
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Gameplay & motion</h2>
        <Toggle
          label="Copy mode: highlight typed letters"
          description="Show matching letters and the targeted balloon as you type."
          checked={settings.copyModeHighlight}
          onChange={(copyModeHighlight) => update({ copyModeHighlight })}
        />
        <Toggle
          label="Recall modes: show typing hints"
          description="Off by default — you should recall the whole word yourself."
          checked={settings.recallModeHighlight}
          onChange={(recallModeHighlight) => update({ recallModeHighlight })}
        />
        <Toggle label="Animations" description="Explosions, particles and wobbly balloons." checked={settings.animations} onChange={(animations) => update({ animations })} />
        <Toggle label="Reduced motion" description="Minimise movement and effects." checked={settings.reducedMotion} onChange={(reducedMotion) => update({ reducedMotion })} />
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <CannonPreview skin={skinById(settings.cannonSkin)} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Cannon skin</h2>
          <p className="text-sm text-ink-soft">
            You are using <b>{skinById(settings.cannonSkin).name}</b>. Try the others in the skin locker.
          </p>
        </div>
        <Button variant="pink" icon={<Shirt size={18} />} onClick={() => navigate('skins')}>
          Open skins
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">AI helper (DeepSeek)</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Optional. When adding words from images or text, the AI can fix typos and fill in missing Vietnamese meanings. Your list is sent to
          DeepSeek only when you press “Tidy with DeepSeek AI”. The key is stored only in this browser and is not included in backups.
        </p>
        <label className="block text-sm">
          <span className="mb-0.5 block font-semibold text-ink-soft">DeepSeek API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            className={inputCls}
            placeholder="sk-…"
            value={settings.deepseekApiKey}
            data-testid="deepseek-key"
            onChange={(e) => update({ deepseekApiKey: e.target.value.trim() })}
          />
        </label>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-bold">Backup</h2>
        <p className="mb-3 text-sm text-ink-soft">All data lives in this browser. Export a backup to move it to another device.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="mint" icon={<DatabaseBackup size={18} />} onClick={() => void doExport()}>
            Export backup
          </Button>
          <label className="btn-candy inline-flex cursor-pointer items-center gap-2 rounded-xl bg-surface px-4 py-2 font-semibold">
            <Upload size={18} /> Restore backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void onRestoreFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {backupMsg && <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm font-semibold">{backupMsg}</p>}
      </Card>

      {pendingRestore && (
        <ConfirmDialog
          title="Restore backup?"
          message={
            <>
              The backup contains {pendingRestore.collections.length} collection(s) and {pendingRestore.vocabulary.length} word(s).
              <br />
              <b>Merge</b> keeps your current data (matching items are overwritten). To wipe everything first, use “Replace all”.
              <div className="mt-3">
                <Button size="sm" variant="danger" onClick={() => void restore('replace')}>
                  Replace all
                </Button>
              </div>
            </>
          }
          confirmLabel="Merge"
          onConfirm={() => void restore('merge')}
          onCancel={() => setPendingRestore(null)}
        />
      )}
    </div>
  );
}
