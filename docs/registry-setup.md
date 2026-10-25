# Registry riêng npm.dizai.studio: các bước của bạn

Runbook cho phần việc chỉ bạn hoặc developer của bạn làm được (tài khoản, khoá bí mật, DNS, npmjs, deploy). Mỗi bước có lệnh để dán; xong bước
nào thì nhắn Claude "xong bước N" để Claude kiểm tra kết quả. Chi tiết kỹ thuật của bộ kit (tiếng Anh):
[`tools/registry/README.md`](../tools/registry/README.md).

Lệnh chạy trong Terminal của Mac, **từ thư mục gốc của repo Zen-DS**, trên `main` đã `git pull` (sau khi PR thêm
runbook này được merge: bản deploy Podman cũ chưa biết backup). Không dán khoá bí mật nào vào chat.

## Tình trạng (Claude kiểm tra 2026-10-25)

| Hạng mục | Tình trạng |
| --- | --- |
| VPS | ✓ OVH VPS Singapore `51.79.205.10` (chung máy với PocketBase agent và Caddy hệ thống), registry chạy bằng Podman (`zen-registry.service`), từ 2026-10-14 |
| DNS `npm.dizai.studio` | ✓ bản ghi A → `51.79.205.10` (DNS ở Namecheap) |
| HTTPS | ✓ Let's Encrypt, hết hạn 2027-01-12, Caddy tự gia hạn |
| Registry | ✓ `/-/ping` trả 200; gói `@zen-ds/react` đòi đăng nhập (401); trang đăng nhập Google live khớp code trên `main` |
| Secret GitHub `ZEN_REGISTRY_PUBLISH_KEY` | ✓ đặt 2026-10-14; workflow Release đã publish `v0.3.0` |
| Test bộ kit | ✓ `npm test` trong `tools/registry`: 28/28 (PocketBase + Verdaccio + npm thật) |
| Backup lên R2 | ✗ chưa có: máy chủ không có `backup.env`, gói đã publish chưa được sao lưu → **Bước 1** |
| Theo dõi uptime | ✗ chưa có → **Bước 2** |
| `npm login` thật (Google + licence key) | ✗ chưa thử với tài khoản thật → **Bước 3** |
| Gói cũ trên npmjs | ✗ `@zen-ds/react@0.1.0` và `@zen-ds/tokens@0.1.0` vẫn công khai, chưa deprecate → **Bước 4** |
| Phase 6 (webhook thanh toán) | Polar (bạn chọn 2026-10-25); webhook đã viết và test, developer deploy theo **Bước 5** |

## Bước 0: quyền SSH vào máy chủ

Mac này chưa có khoá SSH nào; lần deploy 2026-10-14 chạy từ máy của Tung (khoá `~/.ssh/tungnt620`). Bỏ qua bước này
nếu bạn để Tung chạy các lệnh `ssh`/`deploy.sh` bên dưới.

1. Tạo khoá trên Mac (đặt passphrase khi được hỏi):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/zen-registry -C zen-registry-deploy
```

2. In khoá công khai (dòng `ssh-ed25519 …`; khoá công khai, gửi đi được):

```bash
cat ~/.ssh/zen-registry.pub
```

3. Gửi dòng đó cho Tung (hoặc người đang giữ quyền root máy chủ). Người đó chạy trên máy mình, thay `<dòng ssh-ed25519 …>`:

```bash
echo '<dòng ssh-ed25519 …>' | ssh -i ~/.ssh/tungnt620 root@51.79.205.10 'cat >> /root/.ssh/authorized_keys'
```

4. Thử từ Mac của bạn. Đúng là in ra hai dòng `active`:

```bash
ssh -i ~/.ssh/zen-registry root@51.79.205.10 systemctl is-active zen-registry caddy
```

## Bước 1: backup hằng đêm lên Cloudflare R2

Thư mục lưu trữ của registry chứa mọi gói đã publish và khoá ký token của khách. Mất nó mà không có backup thì phải
publish lại và mọi khách phải `npm login` lại.

1. Vào [dash.cloudflare.com](https://dash.cloudflare.com) (đăng ký nếu chưa có) → **R2 Object Storage** → bật R2.
   Cloudflare đòi thẻ hoặc PayPal kể cả gói miễn phí (10 GB, không tính phí tải ra). Mỗi phiên bản gói nặng khoảng
   4 MB, giữ 30 bản backup: còn xa mức 10 GB.
2. **Create bucket**: tên `zen-registry-backups`, Location **Automatic** (hoặc gợi ý **Asia-Pacific**) → Create.
3. Trang R2 → **Manage API tokens** → **Create Account API token**:
   - Token name: `zen-registry-backup`
   - Permissions: **Object Read & Write**
   - Specify bucket(s): **Apply to specific buckets only** → `zen-registry-backups`
   - TTL: **Forever** → **Create API Token**

   Trang kết quả hiện **một lần**: **Access Key ID**, **Secret Access Key**, và endpoint S3 dạng
   `https://<account-id>.r2.cloudflarestorage.com`. Giữ trang mở cho bước 5 (và lưu vào trình quản lý mật khẩu).
4. Tạo file cấu hình trên Mac (quyền 600, chỉ bạn đọc được):

```bash
mkdir -p ~/.config/zen-registry && chmod 700 ~/.config/zen-registry
```

```bash
install -m 600 tools/registry/deploy/backup.env.example ~/.config/zen-registry/backup.env
```

5. Mở file và điền ba dòng, dán ngay sau dấu `=`, không dấu cách, không ngoặc kép:

```bash
nano ~/.config/zen-registry/backup.env
```

   | Dòng | Dán gì |
   | --- | --- |
   | `S3_ENDPOINT=` | endpoint S3, bỏ phần `/zen-registry-backups` nếu có ở cuối |
   | `S3_ACCESS_KEY_ID=` | Access Key ID |
   | `S3_SECRET_ACCESS_KEY=` | Secret Access Key |

   Giữ nguyên `S3_PROVIDER`, `S3_BUCKET`, `BACKUP_KEEP_DAYS`. Lưu: `Ctrl+O`, `Enter`, `Ctrl+X`.
6. Deploy lại (chép `backup.env` lên máy chủ lần đầu, cài lịch backup 03:17 UTC; registry khởi động lại trong vài giây):

```bash
tools/registry/deploy/podman/deploy.sh root@51.79.205.10 -i ~/.ssh/zen-registry
```

   Đúng là thấy `nightly backup: /etc/cron.d/zen-registry-backup` và `{} registry up`. Nếu thấy
   `WARNING: no /etc/zen-registry/backup.env` thì file ở bước 4 chưa có.
7. Chạy một bản backup ngay. Đúng là dòng cuối `… backup ok: registry/storage-<thời điểm>.tar.gz` (lần đầu tải image
   rclone và alpine, mất chừng một phút):

```bash
ssh -i ~/.ssh/zen-registry root@51.79.205.10 /opt/zen-registry/deploy/backup.sh
```

8. Trong Cloudflare: bucket `zen-registry-backups` → thư mục `registry/` có file `.tar.gz` vừa tạo.

Nhắn Claude "xong bước 1" kèm dòng `backup ok` (dòng này không chứa khoá).

## Bước 2: theo dõi uptime

Registry sập thì `npm install` và CI của mọi khách đều lỗi, nên cần một dịch vụ bên ngoài báo cho bạn.

1. Đăng ký [UptimeRobot](https://uptimerobot.com) (gói Free).
2. **New monitor**:
   - Monitor type: **HTTP(s)**
   - URL: `https://npm.dizai.studio/-/ping`
   - Friendly name: `Zen registry`
   - Interval: **5 minutes**
   - Alert contacts: email của bạn (cài thêm app UptimeRobot trên điện thoại để nhận push)
3. Thêm monitor thứ hai, cùng cách, cho kho licence (PocketBase sập quá 1 giờ thì registry trả 503):
   URL `https://flrhpbeu1gj0js1.fbjc.pocketbasecloud.com/api/health`, tên `Zen license store`.

Cả hai hiện **Up** sau vài phút. Nhắn Claude "xong bước 2".

## Bước 3: thử `npm login` thật

Thử đúng như khách: một lập trình viên đăng nhập bằng Google, và CI đăng nhập bằng licence key. Token lưu vào thư
mục thử nghiệm, không đụng tới `~/.npmrc` của bạn.

Điều kiện: tài khoản Google bạn dùng là chủ (owner) hoặc thành viên (team member) của một licence `active`, loại
business hoặc pro, và tài khoản Zen đó đã liên kết Google.

```bash
mkdir -p ~/zen-login-test
```

**Lập trình viên (Google).** npm in một đường link và mở trình duyệt (bấm Enter nếu nó hỏi); đăng nhập Google. Đúng là
npm in `Logged in to scope @zen-ds on https://npm.dizai.studio/`.

```bash
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds --userconfig ~/zen-login-test/dev.npmrc
```

Đúng là in `0.3.0`:

```bash
npm view @zen-ds/react version --registry=https://npm.dizai.studio/ --userconfig ~/zen-login-test/dev.npmrc
```

Tải được gói thật (đúng là in `zen-ds-react-0.3.0.tgz`):

```bash
npm pack @zen-ds/react --registry=https://npm.dizai.studio/ --userconfig ~/zen-login-test/dev.npmrc --pack-destination ~/zen-login-test
```

**CI (licence key).** Licence key là ID của licence (15 chữ thường và số), xem trong PocketBase, collection `licenses`,
cột `id`. Khi npm hỏi: Username `zen-test-ci`, Password là licence key (npm hiện vòng xoay ở ô mật khẩu: cứ dán rồi
Enter), Email gì cũng được. Lần thử này chiếm một trong 3 suất token CI của licence đó.

```bash
npm login --registry=https://npm.dizai.studio/ --scope=@zen-ds --auth-type=legacy --userconfig ~/zen-login-test/ci.npmrc
```

Đúng là in `0.3.0`:

```bash
npm view @zen-ds/react version --registry=https://npm.dizai.studio/ --userconfig ~/zen-login-test/ci.npmrc
```

Dọn thư mục thử (xoá cả hai token khỏi máy bạn):

```bash
rm -rf ~/zen-login-test
```

Xem lượt dùng tháng này (cần Bước 0). Đúng là có một dòng cho licence của bạn với 1 developer và 1 CI token:

```bash
ssh -i ~/.ssh/zen-registry root@51.79.205.10 podman exec zen-registry node /verdaccio/plugins/verdaccio-zen-license/usage-report.js
```

Nhắn Claude "xong bước 3" kèm các dòng kết quả (không có token trong đó). Lỗi thường gặp và cách sửa: bảng
"When the install fails" trong [`getting-started.md`](getting-started.md).

## Bước 4: deprecate gói cũ trên npmjs

`@zen-ds/react@0.1.0` và `@zen-ds/tokens@0.1.0` (tài khoản npm `zen-ds`, publish 2026-05-05) vẫn công khai trên
npmjs.com. Dự án nào thiếu dòng `@zen-ds:registry=…` trong `.npmrc` sẽ cài nhầm bản 0.1.0 này. Deprecate giữ tên gói
(không ai khác publish được dưới scope `@zen-ds`) và cho npm in lời nhắn hướng dẫn mỗi lần ai đó cài nó. Không cần
unpublish.

1. Đăng nhập npmjs bằng tài khoản `zen-ds` (trình duyệt, kèm 2FA), vào một file cấu hình tạm:

```bash
npm login --registry=https://registry.npmjs.org/ --userconfig ~/npmjs-zen.npmrc
```

2. Deprecate hai gói (npm có thể hỏi mã 2FA):

```bash
npm deprecate '@zen-ds/react@0.1.0' 'Moved: @zen-ds/react is served only by the licensed Zen registry. Add "@zen-ds:registry=https://npm.dizai.studio/" to .npmrc, then npm login.' --registry=https://registry.npmjs.org/ --userconfig ~/npmjs-zen.npmrc
```

```bash
npm deprecate '@zen-ds/tokens@0.1.0' 'Unmaintained: Zen DS tokens now ship inside @zen-ds/react on the licensed Zen registry, https://npm.dizai.studio/.' --registry=https://registry.npmjs.org/ --userconfig ~/npmjs-zen.npmrc
```

3. Đăng xuất và xoá file tạm:

```bash
npm logout --registry=https://registry.npmjs.org/ --userconfig ~/npmjs-zen.npmrc
```

```bash
rm -f ~/npmjs-zen.npmrc
```

Nhắn Claude "xong bước 4"; Claude kiểm tra bằng `npm view @zen-ds/react@0.1.0 deprecated`.

## Bước 5: webhook Polar (Phase 6, developer làm)

Khách trả tiền trên Polar thì licence tự được tạo; huỷ hoặc hết hạn thì licence tắt và registry chặn trong vòng 5
phút. Webhook là một hook chạy ngay trong kho licence PocketBase (`zen-license-management` trên PocketBase Cloud),
không thêm máy chủ. Mã: `tools/registry/pocketbase/pb_hooks/`; cách nó quyết định (chủ licence, điều khoản, trạng
thái): mục "Payments" trong [`tools/registry/README.md`](../tools/registry/README.md).

**Cần có trước:** tài khoản Polar của Dizai Studio (bạn tạo), quyền vào project PocketBase Cloud của kho licence và
một tài khoản superuser riêng cho developer (bạn cấp), `pbc` trên máy developer (`pbc --version`).

### 5.1 Sản phẩm trên Polar

Mỗi gói bán là một sản phẩm thuê bao (Products → New product, Recurring). Giá và số credits do bạn quyết định. Mỗi
sản phẩm cần **Metadata** (cuối trang sản phẩm) để webhook biết cấp licence gì:

| Key | Giá trị | Bắt buộc |
| --- | --- | --- |
| `zen_type` | `business` hoặc `pro` | có |
| `zen_max_members` | số seat (chủ + thành viên), ví dụ `5`. Bỏ qua nếu sản phẩm bán theo seat: khi đó lấy số seat khách mua | có, trừ gói bán theo seat |
| `zen_credits` | `credits_total` của licence, ví dụ `100` | có |
| `zen_reset_day` | ngày trong tháng reset credits (1–28); mặc định là ngày mua | không |

Thiếu metadata thì khách vẫn trả tiền được nhưng không có licence: dòng `billing_subscriptions` của giao dịch đó ghi
lý do ở cột `problem`. Sửa metadata rồi bấm gửi lại (Redeliver) sự kiện đó trong Polar.

### 5.2 Khách được gắn với tài khoản nào

Khách mua bằng **email của tài khoản Zen** của mình (tài khoản Google đăng nhập trang licence). Chưa có tài khoản thì
licence chờ, và được tạo ngay khi email đó đăng ký và đã xác minh. Trang licence muốn gắn chắc chắn hơn thì mở
checkout link kèm id người dùng: `<checkout link>?reference_id=<id users>&customer_email=<email>`.

### 5.3 Thử trên máy với Polar sandbox (trước khi lên thật)

Chạy PocketBase cục bộ có hook, rồi để Polar CLI chuyển sự kiện sandbox về máy. Không đụng tới kho licence thật.

1. Tạo tổ chức sandbox ở [sandbox.polar.sh](https://sandbox.polar.sh), thêm một sản phẩm có metadata như 5.1.
2. Cài [Polar CLI](https://polar.sh/docs/integrate/cli/introduction) rồi đăng nhập vào sandbox:

```bash
npm install -g @polar-sh/cli
```

```bash
polar auth login --sandbox
```

3. Mở chuyển tiếp sự kiện về PocketBase cục bộ; CLI in một webhook secret `whsec_…` trong banner, giữ terminal mở:

```bash
polar webhook listen http://127.0.0.1:8090/api/zen/billing/polar
```

4. Ở terminal khác, tại thư mục `tools/registry`: tải PocketBase (in đường dẫn) và tạo superuser cục bộ:

```bash
node scripts/fetch-pocketbase.mjs
```

```bash
.bin/pocketbase-0.39.11/pocketbase superuser upsert dev@local.test dev-password-123 --dir .test-tmp/polar-dev --migrationsDir test/pocketbase/pb_migrations
```

5. Chạy PocketBase với hook, thay `<secret>` bằng secret ở bước 3:

```bash
POLAR_WEBHOOK_SECRET='<secret>' .bin/pocketbase-0.39.11/pocketbase serve --dir .test-tmp/polar-dev --migrationsDir test/pocketbase/pb_migrations --hooksDir pocketbase/pb_hooks
```

6. Mở `http://127.0.0.1:8090/_/`, tạo một user trong `users` có email bạn sẽ dùng khi mua, tick **verified**.
7. Mua sản phẩm sandbox bằng email đó, thẻ thử `4242 4242 4242 4242`, hạn bất kỳ trong tương lai, CVC bất kỳ.
   Đúng là: `licenses` có licence mới (`active` bật, đúng `type`, `max_members`, `credits_total`);
   `billing_subscriptions` có một dòng trỏ tới nó, cột `problem` trống. Nếu mở checkout kèm `?reference_id=`, cột
   `reference` có id đó.
8. Trong Polar sandbox, huỷ thuê bao ngay (Revoke). Đúng là licence đó tắt `active`.
9. Xoá dữ liệu thử:

```bash
rm -rf .test-tmp/polar-dev
```

### 5.4 Deploy lên kho licence thật

1. Đăng nhập PocketBase Cloud và tìm tên instance của kho licence (URL `flrhpbeu1gj0js1.fbjc.pocketbasecloud.com`):

```bash
pbc login
```

```bash
pbc pocketbase ls
```

2. Trên Polar (production) → Settings → Webhooks → **Add endpoint**:
   - URL: `https://flrhpbeu1gj0js1.fbjc.pocketbasecloud.com/api/zen/billing/polar`
   - Format: **Raw**
   - Events: mọi sự kiện `subscription.*` (created, active, updated, canceled, uncanceled, cycled, past_due, revoked,
     paused, resumed, migrated). Không cần sự kiện order hay checkout.
   - Secret: để Polar tạo, chép chuỗi `whsec_…`.
3. Ghi secret vào file chỉ bạn đọc được (dán vào sau `POLAR_WEBHOOK_SECRET=`):

```bash
install -m 600 /dev/null ~/.config/zen-registry/polar.env && nano ~/.config/zen-registry/polar.env
```

4. Đặt secret lên instance (thay `<instance>`; lệnh chỉ thêm biến này, giữ nguyên các biến khác. Đừng thêm
   `--delete-missing`):

```bash
pbc env import ~/.config/zen-registry/polar.env --target pocketbase --name <instance>
```

5. Xem các hook đang có (để biết không trùng tên), rồi đẩy hook:

```bash
pbc pocketbase hooks ls --name <instance>
```

```bash
pbc pocketbase hooks push tools/registry/pocketbase/pb_hooks --name <instance>
```

6. Kiểm tra. Đúng là `401` (route chạy, secret đã đặt); `503` là chưa có secret; `404` là hook chưa chạy:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://flrhpbeu1gj0js1.fbjc.pocketbasecloud.com/api/zen/billing/polar
```

7. Một giao dịch thật nhỏ: tạo mã giảm giá 100% trên Polar, mua một gói bằng email một tài khoản Zen thử.
   Đúng là: licence mới `active`; `npm login --auth-type=legacy` với id licence đó cài được gói (như Bước 3); Revoke
   thuê bao trong Polar thì sau tối đa 5 phút `npm view @zen-ds/react` báo 403. Xong thì xoá licence thử.

Nhắn Claude "xong bước 5"; Claude kiểm tra lại bước 6 từ bên ngoài.

**Gỡ ra nếu cần:** tắt endpoint trong Polar, rồi
`pbc pocketbase hooks rm zen_polar.pb.js --name <instance>` và tương tự với `zen_polar.js`. Collection
`billing_subscriptions` ở lại (chỉ superuser đọc được), xoá trong trang quản trị nếu muốn.

## Lựa chọn của bạn (kèm đề xuất)

**Đã chốt (2026-10-25):** giữ OVH VPS hiện tại, backup lên R2, theo dõi bằng UptimeRobot, thanh toán qua Polar. Phần
dưới giữ lại lý do.

**1. Máy chủ.** Đề xuất: **giữ OVH VPS Singapore hiện tại** (`51.79.205.10`). Nó đang chạy ổn, cùng khu vực với kho
licence, không tốn thêm tiền; registry vốn đã phụ thuộc kho licence nên chung máy không thêm rủi ro đáng kể. Chuyển
sang VPS riêng khi máy này thiếu CPU/RAM hoặc khi có nhiều khách trả tiền: chọn gói VPS nhỏ nhất của OVH ở Singapore
(cùng nhà cung cấp, cùng khu vực), Ubuntu 24.04, 1–2 vCPU, 2 GB RAM, rồi dùng đường Docker của kit
(`tools/registry/deploy/deploy.sh`), sửa bản ghi A, chép backup sang (`restore.sh latest`).

**2. Nơi lưu backup.** Đề xuất: **Cloudflare R2** (Bước 1). Khác nhà cung cấp với máy chủ nên còn dữ liệu khi OVH gặp
sự cố; miễn phí ở mức này; kit đã viết sẵn cho nó. OVH Object Storage rẻ tương tự nhưng cùng nhà cung cấp với máy chủ.

**3. Theo dõi uptime.** Đề xuất: **UptimeRobot Free** (5 phút một lần, email + push điện thoại; Bước 2). Better Stack
Free cũng được nếu bạn đã dùng nó.

**4. Thanh toán cho Phase 6.** Phase 6 là một webhook: khách trả tiền thì licence được tạo hoặc bật `active`, hết hạn
hoặc huỷ thì tắt. Claude chỉ xây sau khi bạn chọn.

| Nhà cung cấp | Nhận tiền về Việt Nam | Phí (tham khảo 2026-10) | Ghi chú |
| --- | --- | --- | --- |
| **Polar** (đề xuất) | Có: chi trả qua Stripe Connect Express, Việt Nam có trong danh sách | 5% + 0,50 USD; thêm 1,5% với thẻ ngoài Mỹ; phí chi trả của Stripe | Merchant of Record: Polar bán hộ, tự thu và nộp VAT/GST khắp thế giới. Làm cho phần mềm và gói thuê bao, webhook có chữ ký, mã nguồn mở |
| Lemon Squeezy | Có: chuyển khoản ngân hàng hoặc PayPal | khoảng 5% + 0,50 USD | Cũng là Merchant of Record; thuộc Stripe từ 2024, hướng đi sản phẩm chưa rõ |
| Paddle | Chưa xác nhận được từ tài liệu công khai | khoảng 5% + 0,50 USD | Merchant of Record mạnh cho B2B; duyệt người bán chặt |
| payOS / SePay | Có (VND, chuyển khoản VietQR) | thấp | Chỉ khách Việt Nam; không phải Merchant of Record: bạn tự xuất hoá đơn và lo thuế |
| Stripe trực tiếp | Không nhận doanh nghiệp đăng ký ở Việt Nam | | Chỉ khả thi qua công ty nước ngoài (Stripe Atlas) |

Đề xuất: **Polar** cho mọi khách, vì khách của Zen là công ty ở nhiều nước và Merchant of Record lo hộ thuế từng nước.
Thêm payOS hoặc SePay sau, chỉ khi khách Việt Nam cần trả bằng VND kèm hoá đơn VAT Việt Nam. Hỏi kế toán về cách ghi
nhận khoản tiền Polar chi trả về (doanh thu xuất khẩu dịch vụ) trước khi bán.

Nguồn: [Polar, quốc gia nhận chi trả](https://polar.sh/docs/merchant-of-record/supported-countries),
[Polar, phí](https://polar.sh/docs/merchant-of-record/fees),
[Lemon Squeezy, quốc gia hỗ trợ](https://docs.lemonsqueezy.com/help/getting-started/supported-countries),
[Paddle, quốc gia hỗ trợ](https://developer.paddle.com/concepts/sell/supported-countries-locales).

## Vận hành về sau

| Việc | Lệnh (trên máy chủ, qua `ssh -i ~/.ssh/zen-registry root@51.79.205.10`) |
| --- | --- |
| Xem log | `journalctl -u zen-registry -f`; backup: `/var/log/zen-registry-backup.log` |
| Khôi phục từ backup | `/opt/zen-registry/deploy/restore.sh latest` |
| Lượt dùng theo licence | `podman exec zen-registry node /verdaccio/plugins/verdaccio-zen-license/usage-report.js [YYYY-MM]` |
| Deploy lại sau khi kit đổi | trên Mac: `tools/registry/deploy/podman/deploy.sh root@51.79.205.10 -i ~/.ssh/zen-registry` |
| Phát hành bản mới | tăng `version` trong `package.json`, commit, `git tag vX.Y.Z && git push origin vX.Y.Z` (workflow Release publish) |
