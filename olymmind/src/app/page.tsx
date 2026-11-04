import { Bell, Gauge, Mountain, Timer } from "lucide-react";
import Link from "next/link";

const ROUNDS = [
  { icon: Timer, name: "Khởi động", desc: "6 câu riêng rồi 12 câu chung. Đúng +10, sai ở phần chung −5. Thi thật chỉ có 5 giây mỗi câu, bản web cho 20 giây để gõ." },
  { icon: Mountain, name: "Vượt chướng ngại vật", desc: "4 hàng ngang mở dần từ khóa và hình ẩn. Đoán sớm được nhiều điểm (60, 50, 40, 30), đoán sai thì dừng vòng." },
  { icon: Gauge, name: "Tăng tốc", desc: "4 câu hình ảnh, sắp xếp, logic. Trả lời đúng càng nhanh càng được nhiều điểm: 40, 30, 20, 10." },
  { icon: Bell, name: "Về đích", desc: "Chọn gói 3 câu 20 hoặc 30 điểm, dùng Ngôi sao hy vọng để nhân đôi điểm, nhưng sai thì mất điểm." },
];

export default function HomePage() {
  return (
    <div className="space-y-8 py-4">
      <section className="space-y-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">Đường lên đỉnh Olympia</h1>
        <p className="mx-auto max-w-xl text-lg text-paper/80">
          Tự ôn luyện đủ 4 vòng thi hoặc chọn từng vòng. Mỗi câu đều có đáp án, lời giải và câu chưa đúng được lưu vào sổ tay để ôn lại.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/play" className="btn btn-gold !px-8 !py-3 text-lg">
            Bắt đầu ôn luyện
          </Link>
          <Link href="/solo" className="btn btn-ghost !py-3">
            Luyện nhanh 60 giây
          </Link>
          <Link href="/knowledge" className="btn btn-ghost !py-3">
            Kho kiến thức &amp; Gia sư AI
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {ROUNDS.map(({ icon: Icon, name, desc }, i) => (
          <div key={name} className="card flex gap-4">
            <Icon className="mt-1 shrink-0 text-gold" />
            <div>
              <h2 className="text-xl font-bold">
                Vòng {i + 1}: {name}
              </h2>
              <p className="mt-1 text-sm text-paper/75">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
