// Lesson 04 · example pages 026a–026e: one QuickClinic UI example per Gestalt principle (user, 2026-10-13:
// "Cần ví dụ chi tiết UI từ những principle này. mỗi cái là 1 slide."). Layout 'example': text column + two pinned
// photos, 'not this' / 'do this'. Run one PAGE block per use_figma call after the COMMON block.

// ===== COMMON =====
const page = figma.root.children.find(p => p.id === '727:2'); await figma.setCurrentPageAsync(page);
const L = await (new Function('figma', figma.root.getSharedPluginData('uifdeck', 'lib')))(figma);
const sec = await figma.getNodeByIdAsync('790:2315');   // Lesson 04 · Visual principles
const base = { layout: 'example', where: 'Lesson 04 · Visual principles', time: '4 phút', photoH: 620, textW: 712 };
// screen + right gutter so spec markers can sit outside the screen
L.mock = async function (scr) {
  const m = L.al('HORIZONTAL', 'Mock', 0); m.appendChild(scr); scr.clipsContent = false;
  const gut = figma.createFrame(); gut.name = 'Gutter'; gut.fills = []; gut.resize(52, 10); m.appendChild(gut);
  return m;
};
L.fieldGroup = async function (label, value, gap, state) {
  const g = L.al('VERTICAL', 'Field · ' + label, gap);
  const t = await L.Z(label, 14, 'Medium'); g.appendChild(t);
  const f = await L.zi('textField', { Size: 'Medium (Base)', State: state || 'Inputted' }, { Text: value });
  L.boolProp(f, 'Label', false); g.appendChild(f); f.layoutSizingHorizontal = 'FILL';
  return { g, label: t, field: f };
};
const done = async (r) => { L.reflow(sec); const f = await figma.getNodeByIdAsync(r.slide); return [r, await f.screenshot({ scale: 0.4 })]; };

// ===== PAGE 026a · Proximity =====
L.dProximity = async function (gp) {
  const s = await L.screen(gp.name, 380, { pad: 24, padTop: 24, padBottom: 28, gap: gp.section });
  const head = L.al('VERTICAL', 'Header', 4); s.appendChild(head); head.layoutSizingHorizontal = 'FILL';
  head.appendChild(await L.Z('Book a visit', 22, 'Bold'));
  head.appendChild(await L.Z('Dr. Lan Nguyen · Cardiology', 14, 'Regular', 'base'));
  const refs = {};
  for (const [title, fields] of [['Patient', [['Full name', 'Tran Minh Anh'], ['Phone', '0912 345 678']]], ['Visit', [['Date and time', 'Tue 15 Oct, 09:30']]]]) {
    const sct = L.al('VERTICAL', 'Section · ' + title, gp.title); s.appendChild(sct); sct.layoutSizingHorizontal = 'FILL';
    const st = await L.Z(title, 15, 'Semi Bold', 'base'); sct.appendChild(st); refs[title] = st;
    const list = L.al('VERTICAL', 'Fields', gp.field); sct.appendChild(list); list.layoutSizingHorizontal = 'FILL';
    for (const [lab, val] of fields) { const fg = await L.fieldGroup(lab, val, gp.label); list.appendChild(fg.g); fg.g.layoutSizingHorizontal = 'FILL'; refs[lab] = fg; }
  }
  const btn = await L.zi('button', { Size: 'Large', Level: 'Primary', State: 'Default' }, { Text: 'Continue' }); s.appendChild(btn); btn.layoutSizingHorizontal = 'FILL';
  await L.redline(s, refs['Phone'].label, refs['Phone'].field, 366);
  await L.redline(s, refs['Full name'].field, refs['Phone'].label, 366);
  await L.redline(s, refs['Phone'].field, refs['Visit'], 366);
  return L.mock(s);
};
const r26a = await L.slide(sec, 20, Object.assign({}, base, {
  name: '026a · Proximity in a form', ref: 'UIF-04/26a', page: '26a', note: 'example 1 of 5',
  title: 'Proximity\nin a form',
  deck: 'Close things read as one group. Spacing alone tells which label goes with which field.',
  points: ['Label to its field: 4 to 8 px.', 'Field to field: 16 to 24 px.', 'Section to section: 32 to 48 px.'],
  photos: [
    { label: 'not this', illo: { kind: 'custom', draw: "return api.dProximity({ name: 'Dont', label: 14, field: 14, title: 14, section: 14 })" }, caption: 'Fig. 3a — Even 14 px gaps: which label goes where?' },
    { label: 'do this', illo: { kind: 'custom', draw: "return api.dProximity({ name: 'Do', label: 6, field: 20, title: 12, section: 36 })" }, caption: 'Fig. 3b — 6 / 20 / 36: three levels of grouping.' },
  ],
  kn: [
    ['Mục tiêu trang', 'Học viên thấy nguyên lý gần nhau (proximity) trên một màn hình thật: khoảng cách quyết định cái gì đi với cái gì, trước cả màu và chữ.'],
    ['Lời giảng', 'Ở trang trước, 18 chấm tròn tách thành 2 nhóm chỉ nhờ khoảng trống. Bây giờ áp dụng vào form đặt lịch khám của QuickClinic.\n\nMột form có ba cấp quan hệ:\n· Nhãn và ô nhập của nó: quan hệ chặt nhất, khoảng cách nhỏ nhất, 4 đến 8 px.\n· Ô này với ô kế tiếp: cùng một nhóm thông tin nhưng là hai câu hỏi khác nhau, 16 đến 24 px.\n· Nhóm này với nhóm khác, ví dụ “Patient” và “Visit”: 32 đến 48 px, thường kèm một tiêu đề nhỏ.\n\nQuy tắc dễ nhớ: khoảng cách bên trong một nhóm phải nhỏ hơn rõ rệt khoảng cách giữa các nhóm. Nếu mọi khoảng cách bằng nhau, mắt không còn manh mối nào để gom nhóm, người dùng phải đọc từng chữ mới hiểu form có mấy phần.\n\nCác con số 4, 8, 16, 24, 32, 48 đều nằm trên thang 4 px, đúng các token spacing của Zen; Lesson 05 sẽ học kỹ thang này. Trong Figma: mỗi cặp nhãn và ô là một auto layout gap 6; các cặp trong cùng nhóm nằm trong auto layout gap 20; các nhóm nằm trong auto layout gap 36. Cấu trúc layer phản ánh đúng cách nhóm, nên dev đọc lại cũng thấy ngay.'],
    ['Minh hoạ', 'Hai ảnh là cùng một form, cùng nội dung. Bên trái mọi khoảng cách đều 14 px (ba vạch đo cùng ghi 14): chỉ vào nhãn “Phone”, nó cách ô phía trên và ô phía dưới bằng nhau, nên không rõ nó thuộc ô nào; tiêu đề “Visit” cũng dính vào ô ngay trước. Bên phải ba vạch đo là 6 (nhãn với ô), 20 (ô với ô), 36 (nhóm với nhóm). Không thêm đường kẻ hay màu nào mà form tự chia thành hai phần.'],
    ['Lỗi hay gặp', '· Dùng một gap cho cả màn hình “cho đều”.\n· Nhãn nằm giữa hai ô, cách đều cả hai.\n· Kẻ đường phân cách thay vì tăng khoảng trống: thêm nhiễu mà nhóm vẫn không rõ.\n· Khoảng cách lẻ như 13, 17 px, không theo thang spacing.'],
    ['Hoạt động (2 phút)', 'Cho lớp nhìn ảnh bên trái 5 giây rồi che lại, hỏi: form có mấy phần? Làm lại với ảnh bên phải. Thường bên trái lớp đoán 1 hoặc 3, bên phải đa số trả lời đúng 2.'],
    ['Chuyển ý', 'Khoảng cách gom nhóm theo vị trí; trang sau, những thứ giống nhau về hình thức cũng được xem là một nhóm.'],
  ],
}));
return await done(r26a);
