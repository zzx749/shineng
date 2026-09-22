import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// 把指定 DOM 元素导出为多页 PDF（html2canvas 渲染为图片后逐页拼入 jsPDF）
// 中文无需内嵌字体，直接走 DOM 渲染。
export async function exportElementToPdf(el, filename = 'report.pdf') {
  if (!el) throw new Error('未找到可导出的内容')

  const canvas = await html2canvas(el, {
    scale: 2, // 2 倍采样，保证文字清晰
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const margin = 0
  const imgWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position -= pageHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(filename)
}
