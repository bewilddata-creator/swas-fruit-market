import { StockPoller } from './StockPoller';

export function LineFooter({ lineUrl, updatedAt }: { lineUrl: string | null; updatedAt: string }) {
  return (
    <footer className="mt-10">
      <a
        href={lineUrl ?? '#'}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center justify-center bg-brand text-white text-[22px] font-bold min-h-[64px] py-4 rounded-card mx-2 md:mx-4 shadow"
        aria-label="เปิดกลุ่ม LINE เพื่อจอง"
      >
        <span>📱 จองผ่าน LINE แชท</span>
        <span className="text-sm font-normal opacity-90">คลิกเพื่อเปิดกลุ่ม</span>
      </a>
      <p className="text-center text-sm text-muted mt-4 pb-6">
        <StockPoller initialUpdatedAt={updatedAt} />
      </p>
    </footer>
  );
}
