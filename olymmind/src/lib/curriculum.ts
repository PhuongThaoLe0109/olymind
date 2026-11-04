// Khung chủ đề để sinh đề: các phân môn x chủ đề x khối lớp, theo cấu trúc Chương trình GDPT 2018 (sách Kết nối tri thức,
// Chân trời sáng tạo, Cánh diều) và chương trình 2006, cộng thêm mảng "ngoài SGK" (sách tham khảo, khoa học phổ thông,
// văn hóa, nghệ thuật, thể thao). Đây là DANH MỤC chủ đề để rải đều câu hỏi, không phải nội dung sách chép lại.
import type { CategoryKey } from "./types";

export interface Topic {
  id: string;
  label: string;
  /** Khối lớp thấp nhất và cao nhất mà chủ đề xuất hiện (0 = ngoài chương trình). */
  grades: [number, number];
  /** Gợi ý cho người ra đề: nên hỏi về cái gì, ở mức nào. */
  hint: string;
  /** Chủ đề nằm ngoài sách giáo khoa. */
  beyond?: boolean;
}

const t = (id: string, label: string, grades: [number, number], hint: string, beyond = false): Topic => ({ id, label, grades, hint, beyond });

export const CURRICULUM: Partial<Record<CategoryKey, Topic[]>> = {
  toan: [
    t("toan-so-hoc", "Số học, chia hết, số nguyên tố", [4, 8], "ước, bội, ƯCLN, BCNN, số nguyên tố, dấu hiệu chia hết, số chính phương"),
    t("toan-dai-so", "Đại số: biểu thức, phương trình, bất đẳng thức", [7, 12], "giá trị biểu thức, nghiệm phương trình, hằng đẳng thức, Vi-ét, bất đẳng thức Cô-si"),
    t("toan-ham-so", "Hàm số, đồ thị, mũ - lôgarit", [9, 12], "tính chất hàm số, tập xác định, cực trị, đạo hàm cơ bản, lôgarit"),
    t("toan-hinh-phang", "Hình học phẳng", [5, 9], "định lý Pytago, Talet, đường tròn, diện tích, góc nội tiếp, đường trung bình"),
    t("toan-hinh-khong-gian", "Hình học không gian và tọa độ", [8, 12], "thể tích khối đa diện, khối tròn xoay, vectơ, tọa độ Oxyz"),
    t("toan-luong-giac", "Lượng giác", [10, 12], "giá trị lượng giác góc đặc biệt, công thức biến đổi, phương trình lượng giác cơ bản"),
    t("toan-to-hop-xs", "Tổ hợp, xác suất, thống kê", [6, 12], "hoán vị, chỉnh hợp, tổ hợp, xác suất cổ điển, trung bình, trung vị"),
    t("toan-day-so", "Dãy số, quy luật", [4, 11], "cấp số cộng, cấp số nhân, quy luật dãy số, tổng dãy"),
    t("toan-mach-tinh", "Tính nhanh, đếm và mẹo toán đố", [3, 9], "đếm chữ số, trailing zero của n!, bài toán tuổi, chuyển động, tính nhanh"),
    t("toan-lich-su", "Lịch sử toán học và nhà toán học", [0, 0], "nhà toán học, định lý, bài toán nổi tiếng (Fermat, Euler, Gauss, Ramanujan, Hilbert...)", true),
    t("toan-hang-so", "Hằng số, ký hiệu và thuật ngữ toán", [6, 12], "số pi, số e, tỷ lệ vàng, ký hiệu toán học, tên gọi các đường, các hình đặc biệt"),
  ],
  ly: [
    t("ly-co-hoc", "Cơ học: chuyển động, lực, năng lượng", [6, 12], "định luật Newton, rơi tự do, ném xiên, công, công suất, bảo toàn năng lượng"),
    t("ly-nhiet", "Nhiệt học, chất khí", [6, 12], "nhiệt lượng, nở vì nhiệt, định luật chất khí, nhiệt độ tuyệt đối, chuyển thể"),
    t("ly-dien", "Điện, từ trường, cảm ứng điện từ", [7, 12], "định luật Ôm, điện trở, mạch điện, lực Lo-ren-xơ, cảm ứng điện từ, máy biến áp"),
    t("ly-song-dao-dong", "Dao động, sóng, âm", [7, 12], "con lắc, chu kỳ, bước sóng, giao thoa, sóng dừng, độ cao độ to của âm"),
    t("ly-quang", "Quang học", [7, 12], "phản xạ, khúc xạ, thấu kính, tán sắc, giao thoa ánh sáng, tia hồng ngoại và tử ngoại"),
    t("ly-hat-nhan", "Vật lý hiện đại và hạt nhân", [12, 12], "phóng xạ, phản ứng hạt nhân, quang điện, thuyết lượng tử, hạt cơ bản"),
    t("ly-don-vi", "Đơn vị và nhà vật lý", [6, 12], "đơn vị SI, nhà vật lý, định luật mang tên người, thí nghiệm kinh điển"),
    t("ly-hien-tuong", "Hiện tượng vật lý đời sống", [3, 9], "cầu vồng, sấm chớp, vì sao bầu trời xanh, sự phản chiếu, hiện tượng quán tính", true),
    t("ly-thien-van", "Vật lý thiên văn, vũ trụ học", [0, 0], "lỗ đen, Big Bang, sao neutron, thuyết tương đối, sóng hấp dẫn", true),
  ],
  hoa: [
    t("hoa-cau-tao-chat", "Nguyên tử, bảng tuần hoàn, liên kết", [7, 12], "cấu hình electron, nhóm và chu kỳ, độ âm điện, liên kết ion và cộng hóa trị"),
    t("hoa-vo-co", "Hóa vô cơ: axit, bazơ, muối, kim loại", [8, 12], "tính chất, dãy hoạt động hóa học, phản ứng đặc trưng, nhận biết chất"),
    t("hoa-huu-co", "Hóa hữu cơ", [9, 12], "hiđrocacbon, ancol, axit cacboxylic, este, polime, tên gọi IUPAC thông dụng"),
    t("hoa-ly-hoa", "Mol, dung dịch, tốc độ phản ứng, cân bằng", [8, 12], "pH, nồng độ, định luật bảo toàn, nguyên lý Lơ Sa-tơ-li-ê, điện phân, pin điện"),
    t("hoa-ung-dung", "Hóa học đời sống và công nghiệp", [8, 12], "phân bón, xà phòng, gang thép, nhiên liệu, chỉ số octan, vật liệu"),
    t("hoa-nguyen-to", "Nguyên tố, tên gọi và khám phá", [8, 12], "ký hiệu, số hiệu, người khám phá, tên nguyên tố mang tên người hay địa danh"),
    t("hoa-lich-su", "Lịch sử hóa học và nhà hóa học", [0, 0], "Mendeleev, Lavoisier, Curie, Haber, Nobel Hóa học, phát minh hóa học", true),
    t("hoa-chat-doc-nguy-hiem", "Hóa chất, an toàn phòng thí nghiệm", [6, 12], "dụng cụ thí nghiệm, quy tắc an toàn, tên thường gọi của hóa chất (muối ăn, xút, nước Gia-ven...)"),
  ],
  sinh: [
    t("sinh-te-bao", "Tế bào và bào quan", [6, 12], "cấu tạo tế bào, bào quan, màng, ti thể, lục lạp, phân bào"),
    t("sinh-di-truyen", "Di truyền, ADN, gen", [9, 12], "Menđen, ADN, ARN, phiên mã, dịch mã, đột biến, quy luật di truyền"),
    t("sinh-tien-hoa", "Tiến hóa và sinh thái", [9, 12], "Đác-uyn, chọn lọc tự nhiên, hệ sinh thái, chuỗi thức ăn, quần xã"),
    t("sinh-thuc-vat", "Thực vật học", [6, 11], "quang hợp, hô hấp, hoa, quả, hormone thực vật, vận chuyển nước"),
    t("sinh-dong-vat", "Động vật học", [6, 11], "phân loại, đặc điểm các lớp động vật, tập tính, tuần hoàn"),
    t("sinh-nguoi", "Cơ thể người", [8, 11], "hệ tiêu hóa, tuần hoàn, hô hấp, thần kinh, nội tiết, miễn dịch, vitamin"),
    t("sinh-vi-sinh", "Vi sinh vật và virus", [10, 12], "vi khuẩn, virus, nấm men, lên men, vắc-xin, bệnh truyền nhiễm"),
    t("sinh-tu-nhien", "Thế giới tự nhiên (tiểu học - THCS)", [1, 7], "TN&XH, loài vật, cây cối, vòng đời, môi trường sống, rừng ngập mặn"),
    t("sinh-lich-su", "Lịch sử sinh học và nhà sinh học", [0, 0], "Pasteur, Mendel, Darwin, Watson-Crick, Fleming, giải Nobel Sinh lý hoặc Y học", true),
    t("sinh-ky-luc", "Kỷ lục và kỳ thú của sinh giới", [0, 0], "loài lớn nhất, nhanh nhất, sống lâu nhất, loài đặc hữu Việt Nam (sao la, voọc, ...)", true),
  ],
  su: [
    t("su-co-dai-vn", "Việt Nam cổ đại đến thời Bắc thuộc", [6, 10], "Văn Lang, Âu Lạc, Hai Bà Trưng, Lý Bí, Mai Hắc Đế, Khúc Thừa Dụ, Ngô Quyền"),
    t("su-phong-kien-vn", "Các triều đại Đinh - Lê - Lý - Trần - Hồ", [7, 10], "thiết chế, kháng chiến chống Tống - Mông Nguyên, cải cách, văn hóa"),
    t("su-le-nguyen", "Lê sơ, Mạc, Lê trung hưng, Tây Sơn, Nguyễn", [7, 11], "Lam Sơn, Bộ luật Hồng Đức, Trịnh - Nguyễn phân tranh, Quang Trung, nhà Nguyễn"),
    t("su-can-dai-vn", "Việt Nam 1858-1945", [8, 12], "Pháp xâm lược, phong trào Cần Vương, Duy Tân, Đông Du, Đảng ra đời, Cách mạng tháng Tám"),
    t("su-hien-dai-vn", "Việt Nam 1945-nay", [9, 12], "kháng chiến chống Pháp, Mỹ, Hiệp định Giơnevơ, Paris, thống nhất, Đổi mới"),
    t("su-the-gioi-co-trung", "Thế giới cổ đại và trung đại", [6, 10], "Ai Cập, Lưỡng Hà, Hy Lạp, La Mã, Trung Quốc, Ấn Độ, Tây Âu trung đại, Hồi giáo"),
    t("su-the-gioi-can-hien", "Thế giới cận đại và hiện đại", [8, 12], "cách mạng công nghiệp, hai cuộc thế chiến, Chiến tranh lạnh, Liên Xô, ASEAN, LHQ"),
    t("su-nhan-vat", "Nhân vật, câu nói và di tích lịch sử", [4, 12], "nhận diện nhân vật qua câu nói, tên hiệu, miếu thờ, di sản thế giới"),
    t("su-van-minh", "Văn minh và phát minh", [6, 12], "chữ viết, tôn giáo lớn, phát minh nổi tiếng, kỳ quan thế giới", true),
  ],
  dia: [
    t("dia-tu-nhien-vn", "Địa lý tự nhiên Việt Nam", [8, 12], "núi, sông, đồng bằng, khí hậu, biển đảo, vườn quốc gia, đèo, vịnh"),
    t("dia-kinh-te-vn", "Địa lý kinh tế - dân cư Việt Nam", [9, 12], "vùng kinh tế, cây công nghiệp, dân tộc, đô thị, cảng, khu công nghiệp"),
    t("dia-tinh-thanh", "Tỉnh thành, di sản và địa danh Việt Nam", [4, 12], "tỉnh/thành, đặc sản, di sản UNESCO, địa danh nổi tiếng, sáp nhập địa giới"),
    t("dia-tu-nhien-tg", "Địa lý tự nhiên thế giới", [6, 11], "châu lục, đại dương, dãy núi, sa mạc, sông dài nhất, khí hậu thế giới"),
    t("dia-quoc-gia", "Quốc gia, thủ đô, kinh tế thế giới", [6, 12], "thủ đô, đơn vị tiền tệ, tổ chức khu vực (ASEAN, EU, OPEC), dân số, diện tích"),
    t("dia-trai-dat", "Trái Đất, bản đồ, thiên nhiên", [6, 10], "kinh vĩ tuyến, múi giờ, nội lực ngoại lực, động đất, núi lửa, thủy triều"),
    t("dia-moi-truong", "Môi trường, biến đổi khí hậu, tài nguyên", [8, 12], "hiệu ứng nhà kính, ENSO, băng hà, tài nguyên, phát triển bền vững"),
    t("dia-ky-luc", "Kỷ lục và kỳ quan địa lý", [0, 0], "đỉnh cao nhất, hồ sâu nhất, thác lớn nhất, đảo lớn nhất, quốc gia nhỏ nhất", true),
  ],
  van: [
    t("van-van-hoc-dan-gian", "Văn học dân gian", [1, 12], "truyền thuyết, cổ tích, ca dao, tục ngữ, thành ngữ, truyện cười, sử thi Tây Nguyên"),
    t("van-trung-dai", "Văn học trung đại", [6, 11], "Nguyễn Trãi, Nguyễn Du, Nguyễn Đình Chiểu, Hồ Xuân Hương, Truyện Kiều, thơ Nôm"),
    t("van-hien-dai-1", "Văn học Việt Nam 1900-1945", [8, 12], "Thơ mới, Tự lực văn đoàn, Nam Cao, Ngô Tất Tố, Vũ Trọng Phụng, Nguyễn Tuân"),
    t("van-hien-dai-2", "Văn học Việt Nam 1945-nay", [9, 12], "thơ kháng chiến, Tố Hữu, Nguyễn Minh Châu, Nguyễn Khải, Kim Lân, Lê Minh Khuê, Nguyễn Huy Thiệp"),
    t("van-nuoc-ngoai", "Văn học nước ngoài", [6, 12], "Đường thi, Lỗ Tấn, Pushkin, Tolstoy, Hemingway, Maupassant, Hugo, A. Dumas, Tagore"),
    t("van-tieng-viet", "Tiếng Việt, từ loại, biện pháp tu từ", [3, 12], "từ ghép, từ láy, từ Hán Việt, nghĩa của từ, ẩn dụ, hoán dụ, điển tích, câu"),
    t("van-tac-gia-tac-pham", "Nhận diện tác giả - tác phẩm - nhân vật", [6, 12], "nhân vật trong tác phẩm, trích câu thơ hỏi tác giả/tác phẩm (không trích nguyên văn dài)"),
    t("van-ngoai-sgk", "Tác phẩm ngoài SGK", [0, 0], "tiểu thuyết, truyện thiếu nhi, văn học đương đại, giải thưởng văn học, tác phẩm Nobel Văn học", true),
  ],
  anh: [
    t("anh-tu-vung", "Từ vựng theo chủ đề", [1, 12], "đồ vật, động vật, nghề nghiệp, cảm xúc, từ trái nghĩa, từ đồng nghĩa"),
    t("anh-ngu-phap", "Ngữ pháp: thì, giới từ, mệnh đề", [3, 12], "dạng thì, so sánh, câu điều kiện, giới từ, mạo từ, bị động, câu gián tiếp"),
    t("anh-thanh-ngu", "Thành ngữ, tục ngữ, cụm động từ", [6, 12], "idiom, proverb, phrasal verb phổ biến, chú ý nghĩa bóng"),
    t("anh-van-hoa", "Văn hóa Anh - Mỹ, địa danh, nhân vật", [6, 12], "thủ đô, biểu tượng quốc gia, lễ hội, nhân vật văn học tiếng Anh, thương hiệu"),
    t("anh-tu-nguon-goc", "Từ nguồn gốc, từ viết tắt, thuật ngữ", [6, 12], "viết tắt (NASA, UNESCO...), tiền tố hậu tố, từ mượn tiếng Việt, từ dễ nhầm lẫn"),
    t("anh-van-hoc", "Văn học và âm nhạc tiếng Anh", [0, 0], "Shakespeare, Dickens, Orwell, bài hát và nhạc sĩ nổi tiếng, nhân vật điện ảnh", true),
  ],
  gdcd: [
    t("gdcd-dao-duc", "Đạo đức, kỹ năng sống, chuẩn mực", [1, 9], "lòng trung thực, tôn trọng, trách nhiệm, tiết kiệm, phòng chống bạo lực"),
    t("gdcd-phap-luat", "Pháp luật và quyền công dân", [6, 12], "Hiến pháp, quyền - nghĩa vụ công dân, Luật Giao thông, độ tuổi chịu trách nhiệm hình sự, hợp đồng"),
    t("gdcd-kinh-te", "Kinh tế: cung cầu, tiền tệ, thị trường", [10, 12], "quy luật giá trị, cung - cầu, lạm phát, thuế, ngân hàng, GDP"),
    t("gdcd-to-chuc", "Bộ máy nhà nước và tổ chức quốc tế", [9, 12], "Quốc hội, Chính phủ, Tòa án, LHQ, ASEAN, WTO, các ngày lễ lớn"),
    t("gdcd-triet-hoc", "Triết học và tư tưởng", [11, 12], "vật chất - ý thức, mâu thuẫn, phủ định của phủ định, triết gia", true),
    t("gdcd-xa-hoi", "Xã hội, hướng nghiệp và quyền trẻ em", [6, 12], "hướng nghiệp, bình đẳng giới, an toàn mạng, quyền trẻ em, Công ước quốc tế"),
  ],
  tin: [
    t("tin-may-tinh", "Máy tính, phần cứng, hệ điều hành", [3, 12], "CPU, RAM, ổ cứng, hệ điều hành, đơn vị lưu trữ, bàn phím, cổng kết nối"),
    t("tin-mang", "Mạng, Internet, an toàn thông tin", [6, 12], "giao thức, địa chỉ IP, Wi-Fi, mật khẩu, lừa đảo trực tuyến, mã hóa"),
    t("tin-lap-trinh", "Lập trình, thuật toán, dữ liệu", [6, 12], "Scratch, Python, biến, vòng lặp, độ phức tạp, sắp xếp, hệ nhị phân, hệ thập lục phân"),
    t("tin-cong-cu", "Phần mềm văn phòng và công cụ số", [3, 9], "Word, Excel (hàm cơ bản), PowerPoint, định dạng tệp, phím tắt"),
    t("tin-lich-su", "Lịch sử công nghệ, công ty và nhân vật", [0, 0], "Turing, Ada Lovelace, Tim Berners-Lee, Apple, Google, ngôn ngữ lập trình ra đời", true),
    t("tin-cong-nghe", "Công nghệ trong đời sống (SGK Công nghệ)", [3, 12], "vật liệu, cơ khí, điện dân dụng, trồng trọt, chăn nuôi, thiết kế kỹ thuật"),
    t("tin-ai", "Trí tuệ nhân tạo và công nghệ mới", [0, 0], "AI, học máy, blockchain, IoT, robot, xe tự lái, mạng xã hội", true),
  ],
  "nghe-thuat": [
    t("nt-am-nhac-vn", "Âm nhạc và nhạc cụ Việt Nam", [1, 12], "đàn bầu, đàn tranh, quan họ, ca trù, chầu văn, nhạc sĩ Việt Nam, nhạc cụ dân tộc"),
    t("nt-am-nhac-the-gioi", "Âm nhạc thế giới", [6, 12], "nhà soạn nhạc cổ điển, nhạc cụ phương Tây, khuông nhạc, thể loại, Nobel Văn học cho nhạc sĩ"),
    t("nt-my-thuat", "Hội họa, điêu khắc, kiến trúc", [1, 12], "danh họa, tác phẩm, trường phái, bảo tàng, màu sắc, kiến trúc nổi tiếng"),
    t("nt-dien-anh", "Điện ảnh và sân khấu", [0, 0], "phim Việt Nam đạt giải, đạo diễn lớn, giải Oscar, Cannes, chèo, tuồng, cải lương, múa rối nước", true),
    t("nt-van-hoa-truyen-thong", "Lễ hội, làng nghề, ẩm thực", [4, 12], "lễ hội, làng nghề, trò chơi dân gian, món ăn đặc sản, trang phục dân tộc"),
  ],
  "the-thao": [
    t("tt-olympic", "Thế vận hội và Đại hội thể thao", [0, 0], "Olympic, SEA Games, ASIAD, địa điểm tổ chức, môn thi, kỷ lục", true),
    t("tt-bong-da", "Bóng đá", [0, 0], "World Cup, Euro, V.League, Quả bóng vàng, đội tuyển Việt Nam, luật bóng đá", true),
    t("tt-mon-khac", "Cờ vua, tennis, bóng rổ, cầu lông, võ thuật", [0, 0], "luật chơi, giải đấu lớn, kỳ thủ - vận động viên nổi tiếng, thuật ngữ", true),
    t("tt-the-chat", "Giáo dục thể chất và sức khỏe", [1, 12], "điền kinh, bơi lội, quy tắc an toàn, bài thể dục, dinh dưỡng thể thao"),
    t("tt-vn", "Thể thao Việt Nam", [0, 0], "huy chương vàng Olympic đầu tiên, vận động viên tiêu biểu, Vovinam, bóng chuyền, bóng bàn", true),
  ],
  chung: [
    t("chung-khoa-hoc-pho-thong", "Khoa học phổ thông, phát minh", [0, 0], "phát minh, nhà khoa học, giải Nobel, công nghệ mới, y học", true),
    t("chung-thien-van", "Thiên văn, vũ trụ, thám hiểm", [6, 12], "hệ Mặt Trời, hành tinh, vệ tinh, tàu vũ trụ, nhà du hành, chòm sao"),
    t("chung-viet-nam", "Việt Nam: văn hóa, lịch sử gần, sự kiện", [0, 0], "di sản UNESCO, lễ tết, ca dao hiện đại, nhân vật, sự kiện nổi bật", true),
    t("chung-tg-xa-hoi", "Thế giới: tổ chức, kinh tế, thời sự", [0, 0], "tổ chức quốc tế, tiền tệ, hiệp định, quốc gia nổi bật, giải thưởng lớn", true),
    t("chung-doi-song", "Đời sống: ẩm thực, nghề nghiệp, giao thông", [0, 0], "ẩm thực, nghề nghiệp, luật giao thông, từ ngữ đời thường, phong tục", true),
    t("chung-tri-tue", "Tâm lý, logic, suy luận", [0, 0], "EQ/IQ, ngụy biện logic, cờ, câu đố trí tuệ", true),
    t("chung-sach", "Sách kinh điển và sách khoa học phổ thông", [0, 0], "Lược sử thời gian, Nguồn gốc các loài, Sapiens, Truyện Kiều, Tuổi thơ dữ dội, Dế Mèn phiêu lưu ký", true),
  ],
};

export function topicsOf(cat: CategoryKey): Topic[] {
  return CURRICULUM[cat] ?? [];
}
export function findTopic(id?: string): { cat: CategoryKey; topic: Topic } | null {
  if (!id) return null;
  for (const [cat, list] of Object.entries(CURRICULUM) as [CategoryKey, Topic[]][]) {
    const topic = list.find((x) => x.id === id);
    if (topic) return { cat, topic };
  }
  return null;
}
export function topicLabel(id?: string): string {
  return findTopic(id)?.topic.label ?? "";
}
export const TOTAL_TOPICS = Object.values(CURRICULUM).reduce((n, l) => n + (l?.length ?? 0), 0);

/** Nhóm lớp để mô tả cho người ra đề. */
export function gradeBandText(g: number): string {
  if (g <= 0) return "kiến thức NGOÀI sách giáo khoa (sách tham khảo, văn hóa, khoa học phổ thông, thời sự khoa học), đúng kiểu Olympia";
  return `nền tảng từ SGK lớp ${g} nhưng hỏi ở mức sâu, dữ kiện ít người nhớ`;
}

// ------------------------------------------------------------------ phong cách đề thi Olympia
// Rút ra từ các bộ câu hỏi chương trình đã công bố trên báo và trang tài liệu, không chép câu nào vào ngân hàng.
export const STYLE_GUIDE = `PHONG CÁCH ĐỀ "ĐƯỜNG LÊN ĐỈNH OLYMPIA" (học theo, đừng sao chép câu có sẵn):
- Thí sinh là học sinh lớp 12 (17-18 tuổi), đa số kiến thức hỏi nằm NGOÀI SGK. Tuyệt đối không ra câu mức tiểu học hay THCS phổ thông ("1 + 1", "thủ đô của Pháp").
- Câu ngắn, một dòng, đáp án là MỘT từ, một cụm 2-4 từ, một số hoặc một năm. Không hỏi "hãy kể", "hãy giải thích".
- Khởi động: hỏi thẳng một dữ kiện; trải rất rộng ngoài SGK (nghệ thuật, thể thao, thời sự khoa học, địa danh, đời sống, tiếng Anh).
- Dạng hay gặp: (1) nhận diện nhân vật qua tác phẩm hoặc câu nói; (2) địa danh, thủ đô, di sản; (3) mốc năm / người đầu tiên / nơi đầu tiên; (4) điền từ còn thiếu vào thành ngữ, tên tác phẩm, công thức; (5) tên gọi khác của một khái niệm; (6) đếm hoặc tính nhanh trong đầu; (7) đúng/sai thu về một từ ("Trí thông minh cảm xúc"); (8) thuật ngữ chuyên ngành gọi tên qua định nghĩa.
- Về đích: câu 20 điểm khó vừa, câu 30 điểm rất khó, dữ kiện hẹp, dễ nhầm với đáp án gần giống; vẫn một đáp án duy nhất.
- Tăng tốc: câu suy luận, quy luật, đếm, sắp xếp, tính nhẩm; giải được trong 20-30 giây bằng suy nghĩ, không cần máy tính.
- Tránh: câu mơ hồ nhiều đáp án, số liệu thay đổi theo thời gian, câu tranh cãi, câu "đoán số liệu".`;

/** Chỉ dẫn độ khó. */
export const LEVEL_TEXT: Record<number, string> = {
  1: "dễ, kiến thức phổ thông ai cũng biết",
  2: "trung bình thấp, học sinh THCS chăm chỉ trả lời được",
  3: "trung bình, cần học tốt chương trình THPT",
  4: "khó, cần học sâu hoặc đọc ngoài SGK",
  5: "rất khó, chỉ thí sinh giỏi mới biết, dữ kiện cụ thể và hẹp",
};
