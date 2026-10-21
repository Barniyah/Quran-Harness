/**
 * Frame-wide non-interactive Islamic Mushaf visual overlay registered into
 * `shell.overlay` (`id: 'quran-mushaf-decor'`).
 *
 * When the active theme preference is `mushaf` or `mushaf-dark`, renders:
 * 1. Tiled Islamic 8-pointed star (Khatam) & floral arabesque pattern backdrop
 * 2. Center Rub el Hizb (`۞`) medallion with the Open Mushaf on Carved Rehal
 * 3. Top illuminated ASCII/Unicode header ribbon (`ORNAMENT_HEADER` + `ORNAMENT_DIAMOND`)
 * 4. Bottom floral ornamental border (`ORNAMENT_FLORAL`)
 * 5. Four Mushaf corner arabesque brackets
 */
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import {
  ISLAMIC_PATTERN_DATA_URI,
  MUSHAF_REHAL_DATA_URI,
  ORNAMENT_DIAMOND,
  ORNAMENT_FLORAL,
  ORNAMENT_HEADER,
} from './islamic-assets.ts'
import type { createQuranAppearanceRowStore } from './settings-store.ts'
import css from './QuranMushafOverlay.module.css'

export type QuranMushafOverlayProps =
  PropsRuntime<'shell.overlay'> &
  PropsStore<ReturnType<typeof createQuranAppearanceRowStore>>

function CornerArabesque({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 60V16C4 9.373 9.373 4 16 4H60"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 52V20C10 14.477 14.477 10 20 10H52"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeDasharray="3 2"
      />
      <path
        d="M16 10L22 16L16 22L10 16L16 10Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  )
}

/**
 * Renders the non-interactive Islamic pattern, Mushaf-on-Rehal emblem, and
 * ASCII ornamental borders whenever `mushaf` or `mushaf-dark` is selected.
 */
export function QuranMushafOverlay({ useStore }: QuranMushafOverlayProps) {
  const preference = useStore(s => s.preference)
  if (preference !== 'mushaf' && preference !== 'mushaf-dark') {
    return null
  }
  const isDark = preference === 'mushaf-dark'
  const modeClass = isDark ? css.darkMode : css.lightMode

  return (
    <div
      className={`${css.overlayRoot} ${modeClass}`}
      data-testid="quran-mushaf-overlay"
      data-theme-mode={preference}
      aria-hidden="true"
    >
      {/* 1. Tiled Islamic Khatam & Arabesque Pattern Backdrop */}
      <div
        className={css.patternLayer}
        style={{ backgroundImage: `url("${ISLAMIC_PATTERN_DATA_URI}")` }}
      />

      {/* 2. Four Corner Mushaf Illumination Brackets */}
      <CornerArabesque className={`${css.corner} ${css.cornerTl}`} />
      <CornerArabesque className={`${css.corner} ${css.cornerTr}`} />
      <CornerArabesque className={`${css.corner} ${css.cornerBl}`} />
      <CornerArabesque className={`${css.corner} ${css.cornerBr}`} />

      {/* 3. Top Illuminated ASCII/Unicode Header Cartouche */}
      <div className={css.topBanner} data-testid="quran-ornament-header">
        <div className={css.topBannerRow}>
          <img src={MUSHAF_REHAL_DATA_URI} alt="" className={css.miniMushafIcon} />
          <span>{ORNAMENT_HEADER}</span>
          <img src={MUSHAF_REHAL_DATA_URI} alt="" className={css.miniMushafIcon} />
        </div>
        <div className={css.topSubRow}>{ORNAMENT_DIAMOND}</div>
      </div>

      {/* 4. Center Watermark: Rub el Hizb Octagram + Open Mushaf on Carved Rehal */}
      <div className={css.centerMedallion} data-testid="quran-mushaf-watermark">
        <div className={css.medallionFrame}>
          <svg
            className={css.medallionSvg}
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="36"
              y="36"
              width="168"
              height="168"
              rx="6"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <rect
              x="36"
              y="36"
              width="168"
              height="168"
              rx="6"
              transform="rotate(45 120 120)"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle
              cx="120"
              cy="120"
              r="76"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          </svg>
          <img
            src={MUSHAF_REHAL_DATA_URI}
            alt=""
            className={css.mushafWatermarkImg}
          />
        </div>
        <div className={css.watermarkCaption}>{ORNAMENT_FLORAL}</div>
      </div>

      {/* 5. Bottom Floral ASCII/Unicode Ornament Strip */}
      <div className={css.bottomBanner} data-testid="quran-ornament-footer">
        {ORNAMENT_FLORAL}
      </div>
    </div>
  )
}
