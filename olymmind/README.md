## Bản cập nhật: lịch sử, đề tự sinh, phân môn, âm thanh

- **Lịch sử và làm tiếp**: mỗi ván lưu sau từng câu (`/history`). Bấm vào để xem tiến độ từng câu, rồi chọn Làm tiếp hoặc Làm lại.
- **Phân môn đã làm qua** (`/subjects`): 13 phân môn, mỗi phân môn liệt kê các câu đã làm kèm đáp án của bạn, chủ đề, và thành tích theo mốc (1, 5, 10, 25, 50... câu).
- **Không lặp câu**: mỗi câu có dấu vân tay (nội dung + đáp án). Bộ sinh đề loại mọi câu đã làm và câu đang nằm trong ván dở dang, đồng thời rải đều theo chủ đề.
- **Đề mới mỗi ván**:
  - Có `GEMINI_API_KEY` (hoặc `ANTHROPIC_API_KEY`) trong `.env.local`: AI sinh đề theo chủ đề, kèm câu mẫu cùng chủ đề trong kho, rồi một lượt AI độc lập giải lại để đối chiếu.
  - Không có key: dùng kho 258 câu khó, các bộ sinh toán logic/dãy số/hình ảnh/quy đổi tự tính đáp án, và ô chữ có sẵn.
- Đối tượng thí sinh 17-18 tuổi: câu hỏi mức khó 3-5, phần lớn ngoài sách giáo khoa.
- **Âm thanh và hoạt ảnh**: hiệu ứng đúng/sai/chuông/đếm giờ và nhạc nền được tổng hợp bằng Web Audio (không cần file), có nút bật/tắt. Điểm đếm lên kèm +N bay lên; trả lời đúng tất cả thì hiện cúp vinh quang giữa vòng nguyệt quế.
- `artifact/build.ts` đóng gói toàn bộ thành một trang HTML chạy độc lập (`bun run artifact/build.ts`).

# OlymMind

Web tự ôn luyện **Đường lên đỉnh Olympia** (Next.js 14 + TypeScript + Tailwind). Chơi một mình, không bot, không phòng, không Elo.

## Chạy thử
```bash
npm install
cp .env.example .env   # ANTHROPIC_API_KEY (tuỳ chọn, để sinh câu hỏi/gia sư AI)
npm run dev            # http://localhost:3000/play
npm run sim            # mô phỏng engine không cần trình duyệt
```
Không còn Socket.io hay server tuỳ chỉnh nên deploy thẳng lên Vercel được.

## Đã làm
- `/play`: chọn vòng muốn ôn (Khởi động, Vượt chướng ngại vật, Tăng tốc, Về đích), chơi bằng engine chạy ngay trong trình duyệt (`src/lib/engine.ts`, luật nằm trong `rules.ts`).
- Sau mỗi câu luôn hiện đáp án, lời giải và đáp án bạn đã gõ.
- Khởi động gồm 6 câu riêng và 12 câu chung (sai −5); Tăng tốc chấm theo tốc độ (40/30/20/10); Về đích không có cướp điểm.
- Sổ tay câu sai (Leitner), lịch sử và phát lại, kho kiến thức, gia sư AI, sinh câu hỏi bằng Claude (`/api/plan`, `/api/generate`).
- Giao diện theo phong cách chương trình: nền đa giác tím chuyển động, chữ vàng, vòng nguyệt quế.
- Thời gian bản web dài hơn truyền hình để kịp gõ (20/12/15 giây so với 5/3/5 giây).

## Chưa làm / chưa kiểm chứng
- Chưa chạy `next build` (môi trường tạo mã chặn npm). Engine đã test bằng `npm run sim`, demo đã test bằng trình duyệt.
- Mã nhiều người chơi vẫn còn nằm yên trong engine và các model multiplayer trong Prisma, hiện không dùng.
- Một số chi tiết luật gắn nhãn [?] là giả định, [W] là điều chỉnh cho bản web.

## Luật tham chiếu

Luật nằm trong `src/lib/rules.ts`, mỗi giá trị gắn nhãn: **[N]** có trong nguồn đã đọc, **[?]** chưa kiểm chứng được, **[W]** chỉnh cho bản web (gõ phím chậm hơn nói). Luật đổi theo mùa; bản này theo mùa 24–26.

Nguồn đã đọc:

- [VTV: điểm mới của mùa 24](https://english.vtv.vn/tv-show/new-features-of-the-24th-edition-of-road-to-mount-olympia-20231023163023165.htm)
- [VTV: khai mạc mùa 26](https://english.vtv.vn/news/an-exhilarating-race-for-points-opens-the-26th-season-of-road-to-olympia-mount-20251119111337712.htm)
- [VTV: bốn phần thi](https://english.vtv.vn/news/oh-olym-behind-the-competition-of-the-four-lines-contestants-20240826111204781.htm)
- [Tiền Phong: Olympia 21 đổi luật](https://tienphong.vn/gioi-tre/duong-len-dinh-olympia-21-doi-moi-luat-choi-mo-man-tran-thi-tuan-gay-can-1727475.tpo)
- [Báo Quốc tế: luật mùa mới](https://baoquocte.vn/luat-choi-mua-moi-duong-len-dinh-olympia-gay-tranh-cai-159884.html)
- [VTC: đổi luật chơi](https://vtcnews.vn/duong-len-dinh-olympia-doi-luat-choi-nu-sinh-dau-tien-am-vong-nguyet-que-ar827277.html)
- [VTC: màn Về đích](https://vtcnews.vn/man-ve-dich-nghet-tho-cua-10x-truong-lang-am-vong-nguyet-que-tuan-olympia-ar917018.html)
- [Báo Nghệ An: chung kết 2025](https://baonghean.vn/en/chung-ket-olympia-2025-ruot-duoi-diem-so-kich-tinh-10309186.html)

Không truy cập được: Wikipedia tiếng Việt, Fandom, luatduonggia.vn. Thời gian trả lời trong bản web dài hơn trên truyền hình vì phải gõ. Phần Khởi động: truyền hình 5 giây mỗi câu riêng, 3 giây chờ bấm chuông, 5 giây trả lời sau khi bấm; bản web cho 20, 12 và 15 giây. Giao diện luôn ghi chú số giây thi thật.

## Cấu trúc
`src/lib` engine, luật, chấm đáp án, kế hoạch câu hỏi cục bộ · `src/hooks/useGame.ts` · `src/app/play` · `src/app/api` · `demo/` bản demo một file HTML.

## Thu thập câu hỏi theo giờ (GitHub Actions)

`.github/workflows/harvest.yml` chạy mỗi giờ: `scripts/harvest.ts` gọi AI sinh khoảng 28 câu cho các chủ đề còn ít câu, nhờ một lượt AI độc lập giải lại để đối chiếu, loại câu trùng, rồi ghi vào `data/pool.json`. Web tự đọc file này như một phần của kho.

1. Đưa dự án lên một repo GitHub.
2. Vào Settings > Secrets and variables > Actions, thêm secret `GEMINI_API_KEY`.
3. Vào tab Actions, bật workflow và bấm Run workflow để thử một lần.

Giới hạn: tối đa 400 câu mỗi 24 giờ (`HARVEST_DAILY_MAX`). Câu nào sai, đổi `"status": "new"` thành `"rejected"` trong `data/pool.json` để web bỏ qua.
