export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('vi-VN');
}
