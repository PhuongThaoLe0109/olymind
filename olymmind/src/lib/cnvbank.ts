// Thêm ô chữ Vượt chướng ngại vật cho kho dự phòng. Vị trí chữ mở ra của mỗi hàng được chia tự động, luôn chừa lại ít nhất một chữ.
import { seeded, shuffle } from "./rng";
import type { CategoryKey, CnvPuzzle } from "./types";

type Row = [CategoryKey, string, string, string, string[]?]; // phân môn, câu hỏi, đáp án, giải thích, đáp án khác

function cnv(keyword: string, centerClue: string, explanation: string, rows: Row[]): CnvPuzzle {
  const L = Array.from(keyword.replace(/\s+/g, "")).length;
  const idx = shuffle(Array.from({ length: L }, (_, i) => i), seeded(keyword)).slice(0, L - 1); // chừa lại một chữ
  const buckets: number[][] = rows.map(() => []);
  idx.forEach((v, i) => buckets[i % rows.length].push(v));
  return {
    keyword,
    center: { clue: centerClue },
    explanation,
    source: "sample",
    rows: rows.map(([category, clue, answer, exp, acc], i) => ({
      category, clue, answer, acceptedAnswers: acc ?? [], reveals: buckets[i].sort((a, b) => a - b), explanation: exp,
    })),
  };
}

export const CNV_BANK: CnvPuzzle[] = [
  cnv("Thăng Long", "Hình ảnh trung tâm: tên gọi cũ của Hà Nội từ năm 1010, nghĩa là 'rồng bay lên'.", "Thăng Long là tên kinh đô do Lý Thái Tổ đặt sau khi dời đô năm 1010.", [
    ["su", "Vị vua nào ban Chiếu dời đô năm 1010?", "Lý Thái Tổ", "Lý Công Uẩn (Lý Thái Tổ) ban Chiếu dời đô, chuyển kinh đô từ Hoa Lư về Đại La.", ["Lý Công Uẩn"]],
    ["dia", "Con sông nào chảy qua Hà Nội, còn có tên khác là Nhị Hà?", "Sông Hồng", "Sông Hồng còn gọi là Nhị Hà, bồi đắp nên đồng bằng Bắc Bộ.", ["Hồng"]],
    ["van", "Tác giả của tập tản văn 'Hà Nội băm sáu phố phường' là ai?", "Thạch Lam", "Thạch Lam viết 'Hà Nội băm sáu phố phường' (1943).", []],
    ["chung", "Văn Miếu - Quốc Tử Giám ở Hà Nội thờ bậc hiền triết nào của Nho giáo?", "Khổng Tử", "Văn Miếu thờ Khổng Tử và các bậc hiền triết Nho giáo.", ["Khổng Tử (Khổng Phu Tử)"]],
  ]),
  cnv("Quang hợp", "Hình ảnh trung tâm: quá trình cây xanh dùng ánh sáng để tổng hợp chất hữu cơ từ nước và khí cacbonic.", "Quang hợp là quá trình sinh học then chốt giải phóng oxi vào khí quyển.", [
    ["sinh", "Sắc tố màu xanh lục trong lá cây tham gia quang hợp tên là gì?", "Diệp lục", "Diệp lục (chlorophyll) hấp thụ ánh sáng đỏ và xanh tím.", ["Chất diệp lục", "Chlorophyll"]],
    ["hoa", "Khí nào được cây xanh hấp thụ để tổng hợp chất hữu cơ trong quang hợp?", "Cacbon đioxit", "Cây hấp thụ CO2 qua khí khổng.", ["CO2", "Khí cacbonic", "Cacbonic", "Khí CO2"]],
    ["ly", "Hiện tượng tia sáng bị gãy khúc khi truyền từ không khí vào nước gọi là gì?", "Khúc xạ", "Khúc xạ ánh sáng xảy ra ở mặt phân cách hai môi trường trong suốt.", ["Khúc xạ ánh sáng"]],
    ["hoa", "Khí nào chiếm khoảng 21% thể tích không khí và duy trì sự cháy?", "Oxi", "Oxi chiếm khoảng 21% thể tích khí quyển.", ["Oxy", "O2", "Ôxi", "Khí oxi"]],
  ]),
  cnv("Hoàng Sa", "Hình ảnh trung tâm: quần đảo thuộc chủ quyền Việt Nam ở Biển Đông, nay thuộc thành phố Đà Nẵng.", "Hoàng Sa là quần đảo thuộc chủ quyền Việt Nam, đặt dưới sự quản lý của thành phố Đà Nẵng.", [
    ["toan", "Tổng ba góc trong của một tam giác bằng bao nhiêu độ?", "180", "Tổng ba góc trong tam giác phẳng bằng 180°.", ["180 độ"]],
    ["su", "Chủ tịch Hồ Chí Minh sinh ra ở tỉnh nào?", "Nghệ An", "Bác Hồ sinh ra ở làng Hoàng Trù (làng Sen), Nam Đàn, Nghệ An.", ["Tỉnh Nghệ An"]],
    ["anh", "What is the capital city of France?", "Paris", "Paris là thủ đô nước Pháp.", ["paris"]],
    ["ly", "Đơn vị đo lực trong hệ SI là gì?", "Niutơn", "Đơn vị lực là niutơn (N), mang tên Isaac Newton.", ["Newton", "N", "Niu-tơn", "Niu tơn"]],
  ]),
  cnv("Nguyễn Trãi", "Hình ảnh trung tâm: tác giả Bình Ngô đại cáo và Quân trung từ mệnh tập, danh nhân văn hóa thế giới.", "Nguyễn Trãi (1380-1442) là nhà chính trị, nhà văn, nhà quân sự kiệt xuất của Đại Việt.", [
    ["van", "Bình Ngô đại cáo được viết theo thể loại văn nghị luận cổ nào?", "Cáo", "Cáo là thể văn nghị luận cổ dùng để công bố một sự kiện quan trọng.", ["Thể cáo"]],
    ["su", "Cuộc khởi nghĩa của Lê Lợi bắt đầu từ vùng núi nào của Thanh Hóa?", "Lam Sơn", "Khởi nghĩa Lam Sơn dấy lên năm 1418 ở vùng núi Lam Sơn.", ["Lam Sơn (Thanh Hóa)"]],
    ["dia", "Thủ đô của nước Trung Quốc là thành phố nào?", "Bắc Kinh", "Bắc Kinh là thủ đô của Trung Quốc.", ["Beijing"]],
    ["su", "UNESCO tôn vinh Nguyễn Trãi là Danh nhân văn hóa thế giới vào năm nào?", "1980", "Năm 1980 UNESCO ghi danh Nguyễn Trãi (nhân kỷ niệm 600 năm ngày sinh).", []],
  ]),
  cnv("Trường Sa", "Hình ảnh trung tâm: quần đảo thuộc chủ quyền Việt Nam, thuộc tỉnh Khánh Hòa.", "Trường Sa là quần đảo của Việt Nam ở Biển Đông, thuộc tỉnh Khánh Hòa.", [
    ["toan", "Căn bậc hai số học của 144 là bao nhiêu?", "12", "12 × 12 = 144.", []],
    ["hoa", "Kim loại nào ở thể lỏng ở nhiệt độ phòng?", "Thủy ngân", "Thủy ngân (Hg) nóng chảy ở khoảng −39°C.", ["Hg", "Thuỷ ngân"]],
    ["van", "Truyện Kiều của Nguyễn Du được viết bằng thể thơ nào?", "Lục bát", "Truyện Kiều gồm 3254 câu thơ lục bát.", ["Thơ lục bát"]],
    ["sinh", "Cơ quan nào bơm máu đi khắp cơ thể người?", "Tim", "Tim là cơ quan trung tâm của hệ tuần hoàn.", ["Trái tim"]],
  ]),
  cnv("Vịnh Hạ Long", "Hình ảnh trung tâm: di sản thiên nhiên thế giới của Việt Nam được UNESCO công nhận lần đầu năm 1994.", "Vịnh Hạ Long (Quảng Ninh) được UNESCO ghi danh năm 1994 và công nhận lần hai năm 2000.", [
    ["dia", "Vịnh Hạ Long thuộc tỉnh nào của Việt Nam?", "Quảng Ninh", "Vịnh Hạ Long nằm ở tỉnh Quảng Ninh, vùng Đông Bắc.", ["Tỉnh Quảng Ninh"]],
    ["su", "Chiến thắng Bạch Đằng năm 1288 là của triều đại nào?", "Nhà Trần", "Năm 1288 Trần Hưng Đạo đại phá quân Nguyên Mông trên sông Bạch Đằng.", ["Triều Trần", "Trần"]],
    ["sinh", "Loài động vật có vú lớn nhất hành tinh là loài nào?", "Cá voi xanh", "Cá voi xanh dài tới khoảng 30 m.", ["Cá voi"]],
    ["anh", "What is the past tense of the verb 'go'?", "Went", "Go - went - gone.", ["went"]],
  ]),
];
