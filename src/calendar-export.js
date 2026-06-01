// Deliver an ICS string to the user.
//   Web:    Blob download (anchor click).
//   Native: write to cache dir + open the OS share sheet (→ Calendar app imports it).
import { Capacitor } from '@capacitor/core';
import { toast } from './utils.js';

function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function exportICS(ics, filename = 'cadence.ics') {
  if (isNative()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      await Filesystem.writeFile({
        path: filename,
        data: ics,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({
        title: 'Add to calendar',
        text: 'Cadence schedule',
        url: uri,
        dialogTitle: 'Add to calendar',
      });
      return true;
    } catch (e) {
      // User dismissing the share sheet throws — don't shout about it.
      if (!/cancel/i.test(e?.message || '')) toast('Calendar export failed');
      return false;
    }
  }

  // Web
  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Calendar file downloaded · open it to import');
    return true;
  } catch {
    toast('Calendar export failed');
    return false;
  }
}
