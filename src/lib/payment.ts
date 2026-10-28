/** Thông tin chuyển khoản + ảnh VietQR (img.vietqr.io, miễn phí) */

export function bankInfo() {
  return {
    bankId: process.env.BANK_ID ?? "",               // mã ngân hàng VietQR, vd MB, VCB, TCB, ACB
    accountNo: process.env.BANK_ACCOUNT_NO ?? "",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "",
  };
}

export function isBankConfigured() {
  const b = bankInfo();
  return !!(b.bankId && b.accountNo);
}

export function vietQrUrl(amount: number, content: string) {
  const b = bankInfo();
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
    accountName: b.accountName,
  });
  return `https://img.vietqr.io/image/${b.bankId}-${b.accountNo}-compact2.png?${params}`;
}

/** Mã đơn = nội dung chuyển khoản. Tiền tố cố định để SePay nhận diện. */
export const ORDER_PREFIX = "LBT";

export function newOrderCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `${ORDER_PREFIX}${n}`;
}

/** Tìm mã đơn trong nội dung CK (ngân hàng hay chèn thêm chữ, bỏ dấu cách…) */
export function extractOrderCode(text: string) {
  const m = text.toUpperCase().replace(/\s+/g, "").match(new RegExp(`${ORDER_PREFIX}\\d{6}`));
  return m ? m[0] : null;
}
