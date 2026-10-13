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

// ===== PAGE 026b · Similarity =====
// slot states: f = free, b = booked, p = picked; odd = the inconsistent look used on the 'not this' screen
L.chip = async function (text, level, sel, size) {
  return L.zi('chip', { Size: size || 'Medium', Level: level, Theme: 'Text-Only', State: 'Default', Select: sel ? 'Yes' : 'No' }, { Text: text });
};
L.dSimilarity = async function (good) {
  const s = await L.screen(good ? 'Do' : 'Dont', 380, { pad: 24, padTop: 24, padBottom: 28, gap: 18 });
  const head = L.al('VERTICAL', 'Header', 4); s.appendChild(head);
  head.appendChild(await L.Z('Choose a time', 22, 'Bold'));
  head.appendChild(await L.Z('Tue 15 Oct · Dr. Lan Nguyen', 14, 'Regular', 'base'));
  // [time, state, look on the 'not this' screen: [level, selected]]
  const groups = [['Morning', [['08:00', 'f', ['Secondary', 0]], ['08:30', 'b', ['Primary', 1]], ['09:00', 'b', ['Secondary', 0]],
    ['09:30', 'p', ['Secondary', 1]], ['10:00', 'f', ['Primary', 0]], ['10:30', 'b', ['Secondary', 0]]]],
    ['Afternoon', [['14:00', 'f', ['Primary', 1]], ['14:30', 'b', ['Secondary', 0]], ['15:00', 'f', ['Secondary', 0]]]]];
  const refs = {};
  for (const [title, slots] of groups) {
    const g = L.al('VERTICAL', title, 10); s.appendChild(g); g.layoutSizingHorizontal = 'FILL';
    g.appendChild(await L.Z(title, 15, 'Semi Bold', 'base'));
    for (let i = 0; i < slots.length; i += 3) {
      const row = L.al('HORIZONTAL', 'Row', 10); g.appendChild(row); row.layoutSizingHorizontal = 'FILL';
      for (const [t, st, odd] of slots.slice(i, i + 3)) {
        const c = good ? await L.chip(t, st === 'p' ? 'Primary' : 'Secondary', st === 'p') : await L.chip(t, odd[0], odd[1]);
        row.appendChild(c); c.layoutSizingHorizontal = 'FILL'; refs[t] = c;
        if (good && st === 'b') { c.opacity = 0.4; const tx = c.findAll(n => n.type === 'TEXT')[0]; await L.loadFontsIn(tx); tx.textDecoration = 'STRIKETHROUGH'; }
      }
    }
  }
  if (good) {
    const lg = L.al('HORIZONTAL', 'Legend', 8); lg.counterAxisAlignItems = 'CENTER'; s.appendChild(lg);
    lg.appendChild(await L.chip('Free', 'Secondary', 0, 'XSmall')); lg.appendChild(await L.chip('Picked', 'Primary', 1, 'XSmall'));
    const bk = await L.chip('Booked', 'Secondary', 0, 'XSmall'); bk.opacity = 0.4; lg.appendChild(bk);
    const tx = bk.findAll(n => n.type === 'TEXT')[0]; await L.loadFontsIn(tx); tx.textDecoration = 'STRIKETHROUGH';
    const btn = await L.zi('button', { Size: 'Large', Level: 'Primary', State: 'Default' }, { Text: 'Book 09:30' }); s.appendChild(btn); btn.layoutSizingHorizontal = 'FILL';
  } else {
    const row = L.al('HORIZONTAL', 'Action', 10); s.appendChild(row);
    const bn = await L.chip('Book now', 'Primary', 1); row.appendChild(bn); refs.book = bn;
  }
  if (!good) { await L.pin(s, refs['08:30'], 1); await L.pin(s, refs['09:00'], 2); await L.pin(s, refs.book, 3); }
  return s;
};
const r26b = await L.slide(sec, 21, Object.assign({}, base, {
  name: '026b · Similarity of states', ref: 'UIF-04/26b', page: '26b', note: 'example 2 of 5',
  title: 'Similarity\nof states',
  deck: 'Things that look alike read as the same kind. Give one look to one meaning, every time.',
  points: ['Every free slot: the same chip.', 'Each state gets its own look.', 'One look, one meaning, always.'],
  photos: [
    { label: 'not this', illo: { kind: 'custom', draw: 'return api.dSimilarity(false)' }, caption: 'Fig. 3c — Mixed looks: free, booked or picked?' },
    { label: 'do this', illo: { kind: 'custom', draw: 'return api.dSimilarity(true)' }, caption: 'Fig. 3d — Free, picked, booked: one look each.' },
  ],
  kn: [
    ['Mục tiêu trang', 'Học viên dùng nguyên lý giống nhau (similarity) để thiết kế trạng thái: cùng một ý nghĩa thì cùng một hình thức, khác ý nghĩa thì khác hình thức.'],
    ['Lời giảng', 'Mắt gom những thứ giống nhau về màu, hình, kích thước, kiểu chữ thành một loại. Trong giao diện, điều đó thành một lời hứa: hai thứ trông giống nhau thì hoạt động giống nhau.\n\nMàn hình chọn giờ khám của QuickClinic có ba loại ô giờ:\n· Còn trống: chip Secondary của Zen, nền sáng.\n· Đang chọn: chip Primary ở trạng thái Select = Yes, nền đậm.\n· Đã có người đặt: chip Secondary mờ đi và gạch ngang giờ, không bấm được.\nBa trạng thái, ba hình thức, và mỗi hình thức chỉ mang một nghĩa trên cả ứng dụng.\n\nNút hành động chính “Book 09:30” là một button, không phải chip: nó làm một việc khác (xác nhận), nên phải trông khác hẳn các ô giờ.\n\nDesign system giúp giữ lời hứa này: dùng đúng component và variant thay vì tự tô màu từng ô. Khi cả đội đều dùng chip Secondary cho “còn trống”, người dùng học một lần là hiểu ở mọi màn hình. Đừng phân biệt trạng thái chỉ bằng màu (WCAG 1.4.1): ô đã đặt vừa mờ vừa bị gạch, và có chú thích.'],
    ['Minh hoạ', 'Bên trái có ba lỗi, đánh số trên ảnh: (1) ô 08:30 đã có người đặt nhưng tô đậm như đang chọn; (2) ô 09:00 đã đặt mà trông y như ô còn trống; (3) nút đặt lịch “Book now” trông như thêm một ô giờ. Thêm nữa, ô trống lúc nền đậm lúc nền sáng. Bên phải: mọi ô trống giống hệt nhau, chỉ ô 09:30 đang chọn nổi lên, các ô đã đặt mờ và gạch ngang, chú thích nhỏ nhắc lại ba trạng thái, và nút chính là button Primary rộng hết chiều ngang.'],
    ['Lỗi hay gặp', '· Dùng màu thương hiệu để trang trí, rồi dùng chính màu đó cho trạng thái đang chọn.\n· Link và chữ thường cùng màu, cùng kiểu.\n· Hai component khác nhau cho cùng một việc ở hai màn hình.\n· Chỉ phân biệt trạng thái bằng màu.'],
    ['Hỏi lớp', '“Nhìn ảnh trái, giờ nào còn đặt được?” Lớp sẽ trả lời không chắc. Hỏi lại với ảnh phải: câu trả lời đến ngay.'],
    ['Chuyển ý', 'Giống nhau gom nhóm theo hình thức; trang sau, một cái khung chung gom được cả những thứ khác nhau.'],
  ],
}));
return await done(r26b);

// ===== PAGE 026c · Common region =====
L.kv = async function (k, v, strong) {
  const r = L.al('HORIZONTAL', 'Row · ' + k, 12); r.primaryAxisAlignItems = 'SPACE_BETWEEN'; r.counterAxisAlignItems = 'CENTER';
  r.appendChild(await L.Z(k, strong ? 16 : 14, strong ? 'Bold' : 'Regular', strong ? 'ink' : 'base'));
  r.appendChild(await L.Z(v, strong ? 16 : 14, strong ? 'Bold' : 'Medium'));
  return r;
};
L.line = async function () { const d = figma.createRectangle(); d.name = 'Divider'; d.resize(10, 1); d.fills = [await L.zpaint('subtle')]; d.opacity = 0.12; return d; };
L.dRegion = async function (good) {
  const s = await L.screen(good ? 'Do' : 'Dont', 380, { pad: good ? 16 : 24, padTop: 24, padBottom: 24, gap: good ? 12 : 14, fill: good ? 'canvas' : 'white' });
  const head = L.al('VERTICAL', 'Header', 4); s.appendChild(head); if (good) { head.paddingLeft = 8; }
  head.appendChild(await L.Z('Review your visit', 22, 'Bold'));
  head.appendChild(await L.Z('Check the details, then confirm.', 14, 'Regular', 'base'));
  const rows = [['Doctor', 'Dr. Lan Nguyen'], ['Specialty', 'Cardiology'], ['Date', 'Tue 15 Oct'], ['Time', '09:30'],
    ['Clinic', '12 Tran Hung Dao'], ['Fee', '300,000 đ'], ['Insurance', '−100,000 đ'], ['Total', '200,000 đ']];
  const add = (p, n) => { p.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; };
  if (!good) {
    for (let i = 0; i < rows.length; i++) { if (i) add(s, await L.line()); add(s, await L.kv(rows[i][0], rows[i][1])); }
  } else {
    const box = async (title) => { const c = await L.card(title, null, { gap: 10, pad: 16, radius: 16 }); add(s, c); c.appendChild(await L.Z(title, 13, 'Semi Bold', 'base')); return c; };
    const doc = await box('Doctor');
    const who = L.al('HORIZONTAL', 'Who', 12); who.counterAxisAlignItems = 'CENTER'; add(doc, who);
    who.appendChild(await L.zi('avatar', { Shape: 'Circle', Size: 'Large', Theme: 'Accent', Background: 'Subtle' }, { Initials: 'LN' }));
    const nm = L.al('VERTICAL', 'Name', 2); who.appendChild(nm);
    nm.appendChild(await L.Z('Dr. Lan Nguyen', 16, 'Semi Bold')); nm.appendChild(await L.Z('Cardiology', 14, 'Regular', 'base'));
    const visit = await box('Visit'); for (const r of rows.slice(2, 5)) add(visit, await L.kv(r[0], r[1]));
    const pay = await box('Payment'); for (const r of rows.slice(5, 7)) add(pay, await L.kv(r[0], r[1]));
    add(pay, await L.line()); add(pay, await L.kv('Total', '200,000 đ', true));
  }
  const btn = await L.zi('button', { Size: 'Large', Level: 'Primary', State: 'Default' }, { Text: 'Confirm booking' }); add(s, btn);
  return s;
};
const r26c = await L.slide(sec, 22, Object.assign({}, base, {
  name: '026c · Common region', ref: 'UIF-04/26c', page: '26c', note: 'example 3 of 5',
  title: 'Common\nregion',
  deck: 'A shared box makes separate items one group. Cards and sections beat extra lines.',
  points: ['One card per topic.', 'A surface, a border, or both.', 'Two levels of boxes at most.'],
  photos: [
    { label: 'not this', illo: { kind: 'custom', draw: 'return api.dRegion(false)' }, caption: 'Fig. 3e — Eight rows split by lines: no groups.' },
    { label: 'do this', illo: { kind: 'custom', draw: 'return api.dRegion(true)' }, caption: 'Fig. 3f — Three cards: doctor, visit, payment.' },
  ],
  kn: [
    ['Mục tiêu trang', 'Học viên dùng vùng chung (common region) để chia một màn hình nhiều thông tin thành các khối dễ quét: card, section, nền khác màu.'],
    ['Lời giảng', 'Những thứ nằm trong cùng một khung được xem là một nhóm, kể cả khi chúng khác nhau về hình thức. Khung có thể là nền khác màu, đường viền, hoặc cả hai.\n\nMàn hình xác nhận lịch khám của QuickClinic có tám dòng thông tin. Người dùng cần trả lời ba câu hỏi: khám với ai, khi nào và ở đâu, trả bao nhiêu. Vậy chia thành ba card:\n· Doctor: avatar, tên, chuyên khoa.\n· Visit: ngày, giờ, phòng khám.\n· Payment: phí khám, bảo hiểm, tổng tiền.\nCác card trắng nằm trên nền Canvas của Zen; chính chênh lệch nền tạo ra vùng, không cần kẻ thêm đường nào.\n\nVùng chung mạnh hơn khoảng cách: khi khoảng cách không đủ (màn hình chật, nội dung dài), một cái khung giữ nhóm rõ ràng. Nhưng đừng lạm dụng: card trong card trong card làm màn hình nặng nề. Tối đa hai cấp khung là đủ cho hầu hết màn hình.'],
    ['Minh hoạ', 'Bên trái: tám dòng, giữa mỗi dòng một đường kẻ, tất cả bằng nhau. Mắt phải đọc từ trên xuống mới biết đâu là thông tin bác sĩ, đâu là tiền, và dòng Total trông như mọi dòng khác. Bên phải: cùng tám thông tin chia vào ba card có tiêu đề nhỏ trên nền xám nhạt; dòng Total in đậm ở cuối card Payment. Hỏi lớp: muốn biết tổng tiền, mắt nhìn vào đâu trước?'],
    ['Lỗi hay gặp', '· Kẻ đường dưới mọi dòng: nhiều đường quá thì không còn nhóm.\n· Card lồng nhiều cấp, mỗi cấp một viền và một bóng.\n· Card trắng trên nền trắng, không viền: vùng biến mất.\n· Một card chứa hai chủ đề không liên quan.'],
    ['Hoạt động (2 phút)', 'Mở màn hình Cài đặt trên điện thoại của học viên (iOS hoặc Android). Đếm có bao nhiêu nhóm, và mỗi nhóm được tạo bằng khung, khoảng cách hay tiêu đề.'],
    ['Chuyển ý', 'Khung khép kín tạo nhóm; trang sau, ngay cả khi hình chưa khép kín, mắt vẫn tự vẽ nốt.'],
  ],
}));
return await done(r26c);
