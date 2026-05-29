'use client';

import React, { useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useReviews, useReviewStats, useSubmitReview } from '@/services/reviews';

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-7 h-7 transition-colors ${s <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const { data: reviews = [], isLoading } = useReviews(20);
  const { data: stats } = useReviewStats();
  const submitMutation = useSubmitReview();

  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({ authorName: '', authorEmail: '', rating: 0, comment: '' });
  const [formError, setFormError] = useState('');

  const PER_PAGE = 3;
  const totalPages = Math.ceil(reviews.length / PER_PAGE);
  const visible = reviews.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  function prev() { setPage((p) => Math.max(0, p - 1)); }
  function next() { setPage((p) => Math.min(totalPages - 1, p + 1)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.authorName.trim()) return setFormError('Please enter your name.');
    if (form.rating === 0) return setFormError('Please select a star rating.');
    if (form.comment.trim().length < 10) return setFormError('Review must be at least 10 characters.');
    try {
      await submitMutation.mutateAsync({
        authorName: form.authorName.trim(),
        authorEmail: form.authorEmail.trim() || undefined,
        rating: form.rating,
        comment: form.comment.trim(),
      });
      setSubmitted(true);
      setForm({ authorName: '', authorEmail: '', rating: 0, comment: '' });
    } catch {
      setFormError('Failed to submit review. Please try again.');
    }
  }

  const avgRating = stats?.averageRating ?? 4.8;
  const totalReviews = stats?.approved ?? 24;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 space-y-10">
      {/* Header */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold text-sm uppercase tracking-widest">
          <Star className="w-4 h-4 fill-current" /> Customer Reviews
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-foreground">
          What Our Customers Say
        </h2>
        <div className="flex items-center justify-center gap-3">
          <StarRating rating={Math.round(avgRating)} size="md" />
          <span className="font-bold text-lg">{avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">({totalReviews} reviews)</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Based on Google reviews — 5 Broadway, Barking
        </p>
      </motion.div>

      {/* Review Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6 space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-24" />
              <div className="h-3 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </CardContent></Card>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {visible.map((review) => (
                <Card key={review.id} className="flex flex-col">
                  <CardContent className="p-6 flex flex-col gap-4 flex-1">
                    <Quote className="w-8 h-8 text-primary/20 flex-shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed flex-1 italic">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                    <div className="space-y-1">
                      <StarRating rating={review.rating} />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {review.author_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.author_name}</p>
                          {review.source === 'google' && (
                            <p className="text-xs text-muted-foreground">Google Review</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prev}
                disabled={page === 0}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <button
                onClick={next}
                disabled={page === totalPages - 1}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Leave a Review */}
      <motion.div
        className="max-w-xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {!showForm && !submitted && (
          <div className="text-center">
            <Button variant="outline" size="lg" onClick={() => setShowForm(true)} className="gap-2">
              <Star className="w-4 h-4" /> Leave a Review
            </Button>
          </div>
        )}

        {submitted && (
          <div className="text-center p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-400">Thank you for your review!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-500">It will appear once our team has approved it.</p>
            <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setShowForm(false); }}>Done</Button>
          </div>
        )}

        {showForm && !submitted && (
          <Card className="border-primary/20">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-lg">Share Your Experience</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name *</label>
                    <input
                      type="text"
                      value={form.authorName}
                      onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                      placeholder="Your name"
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="email"
                      value={form.authorEmail}
                      onChange={(e) => setForm((f) => ({ ...f, authorEmail: e.target.value }))}
                      placeholder="Not shown publicly"
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Rating *</label>
                  <StarPicker value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Review *</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{form.comment.length}/1000</p>
                </div>

                {formError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={submitMutation.isPending} className="gap-2 flex-1">
                    <Send className="w-4 h-4" />
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormError(''); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </section>
  );
}
