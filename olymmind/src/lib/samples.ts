// Ngân hàng câu hỏi mẫu (đã kiểm chứng thủ công) — dùng khi chưa có API key hoặc AI lỗi.
import type { CategoryKey, CnvPuzzle } from "./types";

export interface SampleQ {
  kind: "short" | "logic" | "sequence" | "image";
  category: CategoryKey;
  content: string;
  answer: string;
  acceptedAnswers?: string[];
  explanation: string;
  trivia: string;
  items?: string[];
  media?: string;
}

const s = (
  category: CategoryKey,
  content: string,
  answer: string,
  explanation: string,
  trivia: string,
  acceptedAnswers: string[] = [],
): SampleQ => ({ kind: "short", category, content, answer, acceptedAnswers, explanation, trivia });

const logic = (content: string, answer: string, explanation: string, trivia: string, acceptedAnswers: string[] = []): SampleQ => ({
  kind: "logic",
  category: "toan",
  content,
  answer,
  acceptedAnswers,
  explanation,
  trivia,
});

// ---------------------------------------------------------------- hình ảnh (SVG tự sinh)
const POS: [number, number][] = [
  [30, 32],
  [92, 26],
  [155, 42],
  [48, 92],
  [112, 86],
  [172, 98],
  [28, 150],
  [96, 146],
  [156, 152],
];
const COLORS = ["#EF4444", "#F59E0B", "#38BDF8", "#34D399", "#A78BFA"];

function shapesUri(kind: "circle" | "square" | "triangle", n: number): string {
  const body = POS.slice(0, n)
    .map(([x, y], i) => {
      const c = COLORS[i % COLORS.length];
      if (kind === "circle") return `<circle cx="${x}" cy="${y}" r="15" fill="${c}"/>`;
      if (kind === "square") return `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" fill="${c}"/>`;
      return `<polygon points="${x},${y - 16} ${x + 16},${y + 14} ${x - 16},${y + 14}" fill="${c}"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="200" height="180"><rect width="200" height="180" rx="12" fill="#0F172A"/>${body}</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

const image = (content: string, answer: string, kind: "circle" | "square" | "triangle", n: number, noun: string): SampleQ => ({
  kind: "image",
  category: "toan",
  content,
  answer,
  acceptedAnswers: [],
  explanation: `Trong hình có ${n} ${noun}.`,
  trivia: "Câu hình ảnh ở vòng Tăng tốc đòi hỏi quan sát nhanh và đếm chính xác.",
  media: shapesUri(kind, n),
});

// ---------------------------------------------------------------- ngân hàng
export const SAMPLE_BANK: SampleQ[] = [
  // ----- Lịch sử
  s("su", "Chiến dịch nào của quân dân ta năm 1954 đã kết thúc cuộc kháng chiến chống thực dân Pháp?", "Điện Biên Phủ", "Chiến dịch Điện Biên Phủ kết thúc ngày 7/5/1954, tạo điều kiện cho Hiệp định Giơnevơ được ký kết.", "Chiến dịch kéo dài 56 ngày đêm.", ["Chiến dịch Điện Biên Phủ"]),
  s("su", "Vị vua nào đã dời đô từ Hoa Lư ra Thăng Long năm 1010?", "Lý Thái Tổ", "Năm 1010, Lý Công Uẩn ban Chiếu dời đô, chuyển kinh đô về Đại La và đổi tên thành Thăng Long.", "Tương truyền vua thấy rồng vàng bay lên nên đặt tên là Thăng Long.", ["Lý Công Uẩn"]),
  s("su", "Ai là người đọc Tuyên ngôn Độc lập ngày 2/9/1945 tại Quảng trường Ba Đình?", "Hồ Chí Minh", "Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa.", "Buổi lễ diễn ra tại Hà Nội.", ["Chủ tịch Hồ Chí Minh", "Bác Hồ", "Nguyễn Ái Quốc"]),
  s("su", "Ai chỉ huy trận Bạch Đằng năm 938 đánh bại quân Nam Hán?", "Ngô Quyền", "Ngô Quyền dùng cọc ngầm trên sông Bạch Đằng, đánh tan quân Nam Hán, mở ra thời kỳ độc lập lâu dài.", "Sau chiến thắng, ông xưng vương và đóng đô ở Cổ Loa.", []),
  s("su", "Triều đại phong kiến cuối cùng của Việt Nam là triều đại nào?", "Nhà Nguyễn", "Nhà Nguyễn (1802-1945) kết thúc khi vua Bảo Đại thoái vị tháng 8/1945.", "Kinh đô của nhà Nguyễn là Huế.", ["Triều Nguyễn"]),
  s("su", "Năm nào chiến dịch Hồ Chí Minh toàn thắng, đất nước thống nhất?", "1975", "Ngày 30/4/1975, quân giải phóng tiến vào Dinh Độc Lập, kết thúc cuộc kháng chiến chống Mỹ.", "Chiến dịch Hồ Chí Minh bắt đầu ngày 26/4/1975.", []),
  s("su", "Vị vua nào lãnh đạo nghĩa quân Tây Sơn đại phá quân Thanh năm 1789?", "Quang Trung", "Nguyễn Huệ lên ngôi hoàng đế Quang Trung và đại phá quân Thanh ở Ngọc Hồi - Đống Đa.", "Ông hành quân thần tốc từ Phú Xuân ra Thăng Long.", ["Nguyễn Huệ"]),
  s("su", "Cuộc khởi nghĩa Hai Bà Trưng năm 40 nổ ra để chống lại quân đô hộ của triều đại nào?", "Đông Hán", "Hai Bà Trưng khởi nghĩa năm 40 chống ách đô hộ của nhà Đông Hán, giành quyền tự chủ.", "Hai Bà đóng đô ở Mê Linh.", ["Nhà Hán", "Hán"]),
  // ----- Địa lý
  s("dia", "Đỉnh núi nào được mệnh danh là 'nóc nhà Đông Dương'?", "Phan Xi Păng", "Phan Xi Păng (Lào Cai) cao khoảng 3.143 m, là đỉnh núi cao nhất Việt Nam và Đông Dương.", "Đỉnh núi thuộc dãy Hoàng Liên Sơn.", ["Fansipan", "Fan Si Pan"]),
  s("dia", "Thủ đô của Nhật Bản là thành phố nào?", "Tokyo", "Tokyo là thủ đô và là thành phố đông dân nhất Nhật Bản.", "Tên cũ của Tokyo là Edo.", ["Tô-ky-ô", "Tôkyô"]),
  s("dia", "Đại dương nào lớn nhất thế giới?", "Thái Bình Dương", "Thái Bình Dương chiếm khoảng một phần ba diện tích bề mặt Trái Đất.", "Rãnh Mariana sâu nhất thế giới nằm ở đại dương này.", []),
  s("dia", "Quốc gia nào có diện tích lớn nhất thế giới?", "Nga", "Liên bang Nga có diện tích hơn 17 triệu km².", "Nước này trải dài trên 11 múi giờ.", ["Liên bang Nga", "Russia"]),
  s("dia", "Thủ đô của nước Pháp là thành phố nào?", "Paris", "Paris nằm bên sông Seine, là thủ đô và thành phố lớn nhất của Pháp.", "Tháp Eiffel được xây dựng năm 1889.", ["Pa-ri", "Pa ri"]),
  s("dia", "Vịnh Hạ Long thuộc tỉnh nào của Việt Nam?", "Quảng Ninh", "Vịnh Hạ Long thuộc tỉnh Quảng Ninh, được UNESCO công nhận là Di sản thiên nhiên thế giới.", "Vịnh có hàng nghìn đảo đá vôi.", []),
  s("dia", "Châu lục nào có diện tích lớn nhất thế giới?", "Châu Á", "Châu Á chiếm khoảng 30% diện tích đất liền của Trái Đất.", "Châu Á cũng có dân số đông nhất.", ["Á"]),
  s("dia", "Nước láng giềng nào của Việt Nam nằm ở phía bắc?", "Trung Quốc", "Việt Nam giáp Trung Quốc ở phía bắc, giáp Lào và Campuchia ở phía tây.", "Biên giới đất liền Việt Nam - Trung Quốc dài hơn 1.300 km.", []),
  // ----- Ngữ văn
  s("van", "Tác giả của tác phẩm 'Truyện Kiều' là ai?", "Nguyễn Du", "Truyện Kiều (tên gốc Đoạn trường tân thanh) là kiệt tác của đại thi hào Nguyễn Du.", "Tác phẩm gồm 3.254 câu thơ lục bát.", []),
  s("van", "Nhà văn nào là tác giả của tiểu thuyết 'Tắt đèn'?", "Ngô Tất Tố", "Tắt đèn (1939) khắc họa cuộc sống người nông dân dưới thời thực dân phong kiến, tiêu biểu là chị Dậu.", "Ông còn viết 'Lều chõng'.", []),
  s("van", "Truyện ngắn 'Lão Hạc' là của nhà văn nào?", "Nam Cao", "Nam Cao viết 'Lão Hạc' về số phận bi thảm của người nông dân nghèo.", "Ông còn là tác giả của 'Chí Phèo'.", []),
  s("van", "Ai là tác giả của 'Bình Ngô đại cáo'?", "Nguyễn Trãi", "Bình Ngô đại cáo (1428) được coi là bản tuyên ngôn độc lập thứ hai của dân tộc.", "Bài cáo viết sau khi quân Minh bị đánh đuổi.", []),
  s("van", "Bài thơ 'Tây Tiến' là sáng tác của nhà thơ nào?", "Quang Dũng", "Quang Dũng viết 'Tây Tiến' năm 1948, nhớ về đoàn binh Tây Tiến.", "Bài thơ nổi tiếng với hình tượng người lính bi tráng.", []),
  s("van", "Nhà văn nào là tác giả của 'Dế Mèn phiêu lưu ký'?", "Tô Hoài", "Dế Mèn phiêu lưu ký (1941) là tác phẩm thiếu nhi nổi tiếng của Tô Hoài.", "Ông còn viết 'Vợ chồng A Phủ'.", []),
  // ----- Toán
  s("toan", "Số nguyên tố chẵn duy nhất là số nào?", "2", "Mọi số chẵn lớn hơn 2 đều chia hết cho 2 nên không phải số nguyên tố.", "Số 2 cũng là số nguyên tố nhỏ nhất.", []),
  s("toan", "Tổng ba góc trong một tam giác bằng bao nhiêu độ?", "180", "Trong hình học Euclid, tổng ba góc của tam giác luôn bằng 180 độ.", "Trên mặt cầu, tổng này lớn hơn 180 độ.", []),
  s("toan", "Căn bậc hai số học của 144 là bao nhiêu?", "12", "12 × 12 = 144.", "144 còn được gọi là một tá gồm 12 chục.", []),
  s("toan", "7 nhân 8 bằng bao nhiêu?", "56", "7 × 8 = 56.", "56 = 7 × 8 là một phép tính hay bị nhầm với 54 và 64.", []),
  s("toan", "Số π làm tròn đến hai chữ số thập phân bằng bao nhiêu?", "3,14", "π ≈ 3,14159, làm tròn hai chữ số thập phân là 3,14.", "Ngày 14/3 được gọi là Ngày số Pi.", ["3.14"]),
  s("toan", "Hình lục giác có bao nhiêu cạnh?", "6", "'Lục' nghĩa là sáu, hình lục giác có 6 cạnh và 6 góc.", "Tổ ong có các ô hình lục giác đều.", []),
  // ----- Vật lý
  s("ly", "Đơn vị đo cường độ dòng điện trong hệ SI là gì?", "Ampe", "Ampe (kí hiệu A) là đơn vị cơ bản của cường độ dòng điện trong hệ SI.", "Đơn vị được đặt theo tên nhà vật lý André-Marie Ampère.", ["A", "Ampere", "Am-pe"]),
  s("ly", "Đơn vị đo lực trong hệ SI là gì?", "Niutơn", "Niutơn (N) là lực làm vật khối lượng 1 kg thu gia tốc 1 m/s².", "Đơn vị được đặt theo tên Isaac Newton.", ["Newton", "N", "Niu-tơn"]),
  s("ly", "Vận tốc ánh sáng trong chân không xấp xỉ bao nhiêu km/s (làm tròn)?", "300000", "Ánh sáng đi khoảng 299.792 km mỗi giây trong chân không, làm tròn 300.000 km/s.", "Ánh sáng Mặt Trời mất khoảng 8 phút để tới Trái Đất.", []),
  s("ly", "Hiện tượng cầu vồng là do ánh sáng Mặt Trời bị hiện tượng nào qua các giọt nước mưa?", "Tán sắc", "Ánh sáng trắng bị khúc xạ và tán sắc qua giọt nước thành dải bảy màu.", "Cầu vồng thường có thứ tự màu từ đỏ đến tím.", ["Sự tán sắc", "Tán sắc ánh sáng"]),
  s("ly", "Nước sôi ở bao nhiêu độ C dưới áp suất khí quyển tiêu chuẩn?", "100", "Ở áp suất 1 atm, nước sôi ở 100 °C.", "Trên núi cao, nước sôi ở nhiệt độ thấp hơn.", []),
  // ----- Hóa - Sinh
  s("hoa", "Kí hiệu hóa học của nguyên tố vàng là gì?", "Au", "Au bắt nguồn từ tiếng Latinh 'aurum' nghĩa là vàng.", "Số hiệu nguyên tử của vàng là 79.", []),
  s("hoa", "Công thức hóa học của nước là gì?", "H2O", "Mỗi phân tử nước gồm 2 nguyên tử hiđro và 1 nguyên tử oxi.", "Nước chiếm khoảng 70% khối lượng cơ thể người trưởng thành.", []),
  s("hoa", "Khí nào chiếm tỉ lệ lớn nhất trong khí quyển Trái Đất?", "Nitơ", "Nitơ chiếm khoảng 78% thể tích khí quyển, oxi khoảng 21%.", "Nitơ là thành phần quan trọng của phân đạm.", ["Nito", "N2", "Khí nitơ"]),
  s("sinh", "Bào quan nào được ví là 'nhà máy năng lượng' của tế bào?", "Ti thể", "Ti thể thực hiện hô hấp tế bào, tạo ra phần lớn ATP.", "Ti thể có DNA riêng.", ["Ty thể"]),
  s("sinh", "Quá trình cây xanh tạo chất hữu cơ từ ánh sáng, nước và khí cacbonic gọi là gì?", "Quang hợp", "Cây dùng năng lượng ánh sáng để tổng hợp đường và thải khí oxi.", "Quang hợp diễn ra chủ yếu ở lục lạp.", ["Sự quang hợp"]),
  s("hoa", "Nguyên tố nhẹ nhất trong bảng tuần hoàn là gì?", "Hiđro", "Hiđro (H) có số hiệu nguyên tử 1, là nguyên tố nhẹ nhất.", "Hiđro là nguyên tố phổ biến nhất vũ trụ.", ["Hydro", "Hidro", "H", "Hydrogen"]),
  s("sinh", "Cơ quan nào trong cơ thể người bơm máu đi khắp cơ thể?", "Tim", "Tim co bóp liên tục để đẩy máu qua hệ tuần hoàn.", "Tim người trưởng thành đập khoảng 70 lần mỗi phút khi nghỉ.", ["Trái tim"]),
  // ----- Tiếng Anh
  s("anh", "Dạng quá khứ đơn của động từ bất quy tắc 'go' là gì?", "went", "'Go' là động từ bất quy tắc: go - went - gone.", "'Went' vốn là quá khứ của động từ 'wend'.", []),
  s("anh", "Từ 'beautiful' trong tiếng Việt có nghĩa là gì?", "đẹp", "'Beautiful' là tính từ nghĩa là đẹp.", "Danh từ tương ứng là 'beauty'.", ["xinh đẹp"]),
  s("anh", "Số nhiều của danh từ 'child' là gì?", "children", "'Child' có dạng số nhiều bất quy tắc là 'children'.", "Tương tự: man - men, woman - women.", []),
  s("anh", "Từ trái nghĩa với 'hot' là gì?", "cold", "'Hot' (nóng) trái nghĩa với 'cold' (lạnh).", "'Cool' là mát, 'warm' là ấm.", []),
  s("anh", "Điền vào chỗ trống: 'She ___ to school every day.' (go)", "goes", "Chủ ngữ ngôi thứ ba số ít ở thì hiện tại đơn thêm -es sau 'go'.", "Các động từ kết thúc bằng -o, -s, -x, -ch, -sh thêm -es.", []),
  s("anh", "Cấu trúc 'have/has + V3' dùng cho thì nào trong tiếng Anh?", "Hiện tại hoàn thành", "'Have/has + quá khứ phân từ' là cấu trúc của thì hiện tại hoàn thành.", "Tiếng Anh gọi là present perfect.", ["Present perfect"]),
  // ----- Hiểu biết chung
  s("chung", "Hành tinh nào lớn nhất trong Hệ Mặt Trời?", "Sao Mộc", "Sao Mộc có khối lượng lớn hơn tổng khối lượng các hành tinh còn lại cộng lại.", "Vết Đỏ Lớn trên Sao Mộc là một cơn bão tồn tại hàng trăm năm.", ["Mộc tinh", "Jupiter"]),
  s("chung", "Ngày Quốc khánh của Việt Nam là ngày mấy tháng mấy?", "2/9", "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập.", "Ngày này được kỷ niệm hằng năm.", ["2 tháng 9", "Ngày 2 tháng 9", "02/09", "2-9"]),
  s("chung", "Môn thể thao nào được mệnh danh là 'vua của các môn thể thao'?", "Bóng đá", "Bóng đá có lượng người hâm mộ đông đảo nhất thế giới.", "World Cup tổ chức bốn năm một lần.", []),
  s("chung", "Ai là người đầu tiên đặt chân lên Mặt Trăng năm 1969?", "Neil Armstrong", "Neil Armstrong bước xuống Mặt Trăng trong sứ mệnh Apollo 11.", "Buzz Aldrin là người thứ hai.", ["Armstrong", "Nin Amstrong"]),
  s("chung", "Thủ đô của nước Úc là thành phố nào?", "Canberra", "Canberra là thủ đô của Úc, không phải Sydney hay Melbourne.", "Canberra là thành phố được quy hoạch riêng làm thủ đô.", ["Can-be-ra"]),
  s("chung", "Loài động vật nào lớn nhất hành tinh?", "Cá voi xanh", "Cá voi xanh dài tới khoảng 30 m, là loài động vật lớn nhất từng được biết.", "Tim cá voi xanh nặng cỡ một chiếc xe hơi nhỏ.", ["Cá voi"]),

  // ----- Tăng tốc: logic / toán
  logic("Tìm số tiếp theo của dãy: 2, 4, 8, 16, ...", "32", "Mỗi số bằng số liền trước nhân 2.", "Đây là dãy lũy thừa của 2."),
  logic("Tính giá trị biểu thức: 15 × 4 − 12 ÷ 3", "56", "Nhân chia trước, cộng trừ sau: 60 − 4 = 56.", "Thứ tự thực hiện phép tính: ngoặc, nhân/chia, cộng/trừ."),
  logic("Một hình chữ nhật có chiều dài 12 cm, chiều rộng 5 cm. Đường chéo dài bao nhiêu cm?", "13", "Theo định lý Pythagoras: √(12² + 5²) = √169 = 13.", "(5, 12, 13) là một bộ ba Pythagoras."),
  logic("Tìm số tiếp theo của dãy: 1, 1, 2, 3, 5, 8, ...", "13", "Mỗi số bằng tổng hai số đứng ngay trước nó (dãy Fibonacci): 5 + 8 = 13.", "Dãy Fibonacci xuất hiện trong cách sắp xếp cánh hoa và vỏ ốc."),
  logic("Tìm số tiếp theo của dãy: 3, 6, 11, 18, 27, ...", "38", "Hiệu giữa các số liên tiếp là 3, 5, 7, 9 nên hiệu tiếp theo là 11: 27 + 11 = 38.", "Dãy này có công thức n² + 2."),
  logic("Tổng các số nguyên từ 1 đến 20 bằng bao nhiêu?", "210", "Áp dụng công thức n(n+1)/2 = 20 × 21 / 2 = 210.", "Gauss được cho là đã tìm ra cách tính nhanh này khi còn nhỏ."),
  logic("Một người đi xe đạp với vận tốc 15 km/h trong 2 giờ 30 phút. Quãng đường đi được là bao nhiêu km?", "37,5", "2 giờ 30 phút = 2,5 giờ; quãng đường = 15 × 2,5 = 37,5 km.", "Công thức: quãng đường = vận tốc × thời gian.", ["37.5"]),
  logic("Nếu 3 con mèo bắt 3 con chuột trong 3 phút, thì 100 con mèo bắt 100 con chuột trong bao nhiêu phút?", "3", "Mỗi con mèo bắt một con chuột trong 3 phút nên 100 con mèo bắt 100 con chuột cũng mất 3 phút.", "Đây là câu đố kinh điển về tỉ lệ."),
  logic("Tìm số tiếp theo của dãy: 5, 10, 20, 40, ...", "80", "Mỗi số bằng số liền trước nhân 2.", "Đây là cấp số nhân công bội 2."),
  logic("Tìm số còn thiếu của dãy: 2, 6, 12, 20, 30, ...", "42", "Các số có dạng n(n+1): 1×2, 2×3, 3×4, 4×5, 5×6, nên số tiếp theo là 6×7 = 42.", "Đó là các số 'chữ nhật' (pronic)."),

  // ----- Tăng tốc: sắp xếp
  {
    kind: "sequence",
    category: "su",
    content: "Sắp xếp các sự kiện sau theo thứ tự thời gian từ sớm đến muộn (gõ chuỗi chữ cái, ví dụ ABCD).",
    items: ["Cách mạng Tháng Tám thành công", "Chiến thắng Điện Biên Phủ", "Đại thắng mùa Xuân 1975", "Ký Hiệp định Pa-ri về Việt Nam"],
    answer: "ABDC",
    explanation: "Cách mạng Tháng Tám (1945) → Điện Biên Phủ (1954) → Hiệp định Pa-ri (1973) → Đại thắng mùa Xuân (1975).",
    trivia: "Hiệp định Pa-ri được ký ngày 27/1/1973.",
  },
  {
    kind: "sequence",
    category: "chung",
    content: "Sắp xếp các hành tinh sau theo khoảng cách tăng dần từ Mặt Trời (gõ chuỗi chữ cái).",
    items: ["Sao Hỏa", "Trái Đất", "Sao Mộc", "Sao Kim"],
    answer: "DBAC",
    explanation: "Thứ tự gần đến xa: Sao Kim → Trái Đất → Sao Hỏa → Sao Mộc.",
    trivia: "Sao Thủy là hành tinh gần Mặt Trời nhất.",
  },
  {
    kind: "sequence",
    category: "su",
    content: "Sắp xếp các sự kiện sau theo thứ tự thời gian từ sớm đến muộn (gõ chuỗi chữ cái).",
    items: ["Ngô Quyền đại thắng quân Nam Hán", "Lý Công Uẩn dời đô ra Thăng Long", "Khởi nghĩa Hai Bà Trưng", "Trần Hưng Đạo đại phá quân Nguyên Mông"],
    answer: "CABD",
    explanation: "Hai Bà Trưng (năm 40) → Ngô Quyền (938) → dời đô (1010) → kháng chiến chống Nguyên Mông lần thứ ba (1288).",
    trivia: "Hai chiến thắng trên sông Bạch Đằng cách nhau 350 năm.",
  },
  {
    kind: "sequence",
    category: "toan",
    content: "Sắp xếp các phân số sau theo thứ tự tăng dần (gõ chuỗi chữ cái).",
    items: ["3/4", "1/2", "5/6", "1/3"],
    answer: "DBAC",
    explanation: "Quy đồng mẫu 12: 1/3 = 4/12, 1/2 = 6/12, 3/4 = 9/12, 5/6 = 10/12.",
    trivia: "So sánh phân số thường dùng quy đồng mẫu số.",
  },

  // ----- Tăng tốc: hình ảnh
  image("Có bao nhiêu hình tròn trong hình?", "7", "circle", 7, "hình tròn"),
  image("Có bao nhiêu hình vuông trong hình?", "5", "square", 5, "hình vuông"),
  image("Có bao nhiêu hình tam giác trong hình?", "6", "triangle", 6, "hình tam giác"),
  image("Đếm số hình tròn xuất hiện trong hình.", "8", "circle", 8, "hình tròn"),
];

// ---------------------------------------------------------------- Vượt chướng ngại vật
function svgWaves(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#F59E0B"/><stop offset="0.45" stop-color="#FCD34D"/><stop offset="0.46" stop-color="#0369A1"/><stop offset="1" stop-color="#0F172A"/></linearGradient></defs>` +
    `<rect width="300" height="200" fill="url(#g)"/><circle cx="220" cy="62" r="26" fill="#EF4444"/>` +
    `<path d="M0 120 Q25 105 50 120 T100 120 T150 120 T200 120 T250 120 T300 120 V200 H0Z" fill="#0EA5E9" opacity=".7"/>` +
    `<path d="M0 150 Q25 135 50 150 T100 150 T150 150 T200 150 T250 150 T300 150 V200 H0Z" fill="#0284C7" opacity=".8"/></svg>`
  );
}
function svgPeak(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#0F172A"/>` +
    `<circle cx="150" cy="105" r="78" fill="none" stroke="#F59E0B" stroke-width="10" stroke-dasharray="14 8"/>` +
    `<polygon points="150,45 215,150 85,150" fill="#F59E0B"/><polygon points="160,70 140,110 155,110 140,145 185,100 165,100" fill="#EF4444"/></svg>`
  );
}

export const SAMPLE_CNV: CnvPuzzle[] = [
  {
    keyword: "Biển Đông",
    center: { clue: "Hình ảnh trung tâm: vùng biển rộng phía đông Việt Nam, nơi có quần đảo Hoàng Sa và Trường Sa." },
    imageSvg: svgWaves(),
    explanation: "Biển Đông là vùng biển rộng ở phía đông Việt Nam, giáp nhiều quốc gia trong khu vực.",
    source: "sample",
    rows: [
      { clue: "Dãy núi cao nhất Việt Nam, nơi có đỉnh Phan Xi Păng, tên là gì?", answer: "Hoàng Liên Sơn", acceptedAnswers: [], reveals: [0, 4], explanation: "Dãy Hoàng Liên Sơn ở Tây Bắc, có đỉnh Phan Xi Păng cao 3.143 m." },
      { clue: "Thủ đô của Thái Lan là thành phố nào?", answer: "Bangkok", acceptedAnswers: ["Băng Cốc", "Bang Kok"], reveals: [2, 6], explanation: "Bangkok là thủ đô và thành phố lớn nhất Thái Lan." },
      { clue: "Quốc gia châu Âu có hình dáng giống chiếc ủng là nước nào?", answer: "Ý", acceptedAnswers: ["Italia", "Italy", "Nước Ý"], reveals: [7], explanation: "Nước Ý (Italia) có hình chiếc ủng nổi tiếng trên bản đồ." },
      { clue: "Đại dương lớn nhất thế giới là đại dương nào?", answer: "Thái Bình Dương", acceptedAnswers: [], reveals: [1], explanation: "Thái Bình Dương là đại dương lớn nhất và sâu nhất." },
    ],
  },
  {
    keyword: "Olympia",
    center: { clue: "Hình ảnh trung tâm: tên của chương trình truyền hình đố vui trí tuệ dành cho học sinh phổ thông của VTV." },
    imageSvg: svgPeak(),
    explanation: "Đường lên đỉnh Olympia là chương trình truyền hình của Đài Truyền hình Việt Nam dành cho học sinh THPT.",
    source: "sample",
    rows: [
      { clue: "Nguyên tố hóa học có kí hiệu O là nguyên tố nào?", answer: "Oxi", acceptedAnswers: ["Oxy", "Ôxi", "Oxygen"], reveals: [0, 3], explanation: "O là kí hiệu của oxi, nguyên tố có số hiệu nguyên tử 8." },
      { clue: "Hành tinh gần Mặt Trời nhất là hành tinh nào?", answer: "Sao Thủy", acceptedAnswers: ["Thủy tinh", "Mercury"], reveals: [6], explanation: "Sao Thủy là hành tinh nhỏ nhất và gần Mặt Trời nhất." },
      { clue: "Thủ đô của Vương quốc Anh là thành phố nào?", answer: "Luân Đôn", acceptedAnswers: ["London"], reveals: [2], explanation: "Luân Đôn (London) nằm bên sông Thames." },
      { clue: "Tác giả truyện ngắn 'Chí Phèo' là ai?", answer: "Nam Cao", acceptedAnswers: [], reveals: [4], explanation: "Chí Phèo là truyện ngắn nổi tiếng của nhà văn Nam Cao." },
    ],
  },
];
