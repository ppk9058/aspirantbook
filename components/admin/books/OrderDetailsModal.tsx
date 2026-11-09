"use client"

import React from "react"
import { BookOrder } from "@/lib/books/types"
import { X, CheckCircle2, FileText, ShoppingBag, Download, Printer } from "lucide-react"
import Image from "next/image"

interface OrderDetailsModalProps {
  order: BookOrder | null
  onClose: () => void
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null

  const handleDownloadInvoice = () => {
    const invoiceText = `AspirantBook Official Tax Invoice / Receipt
Order No: ${order.orderNumber}
Date: ${order.date}
Payment Method: ${order.paymentMethod}
Status: ${order.status}

ITEMS PURCHASED:
${order.items.map((i, idx) => `${idx + 1}. ${i.book.title} (Qty: ${i.quantity}) - ₹${i.book.price * i.quantity}`).join("\n")}

Original Total: ₹${order.originalTotal}
Discount Savings: -₹${order.discountTotal}
${order.couponDiscount ? `Coupon Discount (${order.couponCode}): -₹${order.couponDiscount}\n` : ""}
Final Amount Paid: ₹${order.finalTotal}

Digital License: INSTANT eBOOK ACCESS GRANTED
Powered by AspirantBook Online Bookstore & Publications.
`
    const blob = new Blob([invoiceText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Invoice-${order.orderNumber}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-in fade-in-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded-full">
                  Order Invoice
                </span>
                <span className="text-xs text-gray-400 font-semibold">{order.orderNumber}</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">Order & eCommerce Receipt</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Order Summary Ribbon */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-extrabold text-teal-800 tracking-wider block">Date & Time</span>
              <span className="text-xs font-black text-teal-950">{order.date}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold text-teal-800 tracking-wider block">Payment Mode</span>
              <span className="text-xs font-black text-teal-950">{order.paymentMethod}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold text-teal-800 tracking-wider block">Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white">
                {order.status}
              </span>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Purchased eBooks</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.bookId}
                  className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                      <Image src={item.book.coverImage} alt="" width={40} height={48} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 line-clamp-1">{item.book.title}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {item.book.edition} &bull; Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-gray-900">₹{item.book.price * item.quantity}</span>
                    <span className="text-[10px] text-gray-400 line-through block">
                      ₹{item.book.originalPrice * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Original Total</span>
              <span className="font-semibold">₹{order.originalTotal}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Catalog Discount</span>
              <span>-₹{order.discountTotal}</span>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Coupon ({order.couponCode})</span>
                <span>-₹{order.couponDiscount}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-black text-gray-900">
              <span>Total Paid</span>
              <span className="text-teal-700">₹{order.finalTotal}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Digital Delivery Verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadInvoice}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Tax Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
