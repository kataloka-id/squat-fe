# Implementasi Markdown dan Attachment Gambar

Dokumen ini menjelaskan perubahan frontend TMS untuk attachment gambar privat
dan editor Markdown Test Case.

## Attachment gambar

Panel attachment memakai API backend untuk meminta URL upload sementara, lalu
browser mengunggah raw file langsung ke Cloudflare R2 dengan `fetch`. Request
ke R2 tidak membawa cookie atau header Authorization. Setelah upload, frontend
memanggil endpoint completion agar backend memverifikasi object.

Ukuran maksimum dibaca dari `GET /v1/attachments/config`; validasi server tetap
menjadi otoritas. Preview memakai URL sementara dari endpoint attachment dan
tidak menyimpan URL tersebut di state permanen atau Markdown.

## Markdown Test Case

Komponen Markdown bersama dipakai oleh Description, Preconditions, Main Expected
Result, Step Action, dan Step Expected Result. Title tetap plain text.

Editor mendukung:

- paste Markdown multiline pada posisi cursor atau selection;
- konversi aman HTML gambar GitHub menjadi Markdown image;
- paste screenshot, drag-and-drop, dan file picker untuk gambar PNG, JPEG,
  WebP, atau GIF;
- preview image eksternal HTTPS dan reference internal yang terautentikasi.

Screenshot yang diunggah disimpan di Markdown dengan format stabil:

```md
![nama-file](attachment://UUID_ATTACHMENT)
```

Presigned URL tidak pernah dipersist. Reference internal di-resolve hanya saat
preview melalui endpoint backend terautentikasi. HTML mentah tetap tidak dirender
dan URL tidak aman ditolak.

Untuk mencegah orphan attachment, upload gambar di editor baru tersedia setelah
Test Case sudah disimpan dan memiliki ID. Form baru tetap mendukung paste
Markdown biasa.

## Delete attachment

Delete attachment tersedia di form edit Test Case. Setelah API delete berhasil,
semua reference aktif untuk attachment ID tersebut dibersihkan dari seluruh field
Markdown dan step pada draft form. Pengguna harus menekan **Save Changes** agar
perubahan Markdown tersimpan. Panel detail bersifat read-only untuk delete agar
tidak ada reference stale dari aksi di luar form.

Reference di fenced code block, inline code, atau Markdown yang di-escape tidak
diubah karena bukan gambar aktif. Image HTTPS dan attachment lain juga tetap
dipertahankan.

## Pengujian

Pengujian mencakup upload/paste/drop/picker, preview reference internal,
normalisasi GitHub image HTML, isolasi editor multi-step, dan cleanup reference
setelah delete attachment. Jalankan:

```sh
npm test
npm run build
```

Full lint repository masih memiliki temuan baseline di area yang tidak terkait.
