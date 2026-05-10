import Image from "next/image";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Image src="/icon-192.png" alt="" width={80} height={80} className="mb-8" />
      <h1 className="mb-4 font-headline text-3xl font-black uppercase tracking-tighter text-white">
        YOU&apos;RE OFFLINE
      </h1>
      <p className="font-label text-sm tracking-widest text-on-surface-variant">
        CHECK YOUR CONNECTION AND TRY AGAIN
      </p>
    </div>
  );
}
