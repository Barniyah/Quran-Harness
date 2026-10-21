/**
 * Quran Appearance preference row registered into `settings.general.item`
 * with `id: 'appearance'` and `priority: -10` to shadow the built-in 3-cube
 * AppearanceRow, adding `mushaf` (مصحف نهاري) and `mushaf-dark` (مصحف ليلي)
 * alongside `light`, `dark`, and `system`.
 */
import {
  IconDarkOutlineMedium,
  IconFollowsystemOutlineMedium,
  IconLightOutlineMedium,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  ISLAMIC_PATTERN_DATA_URI,
  MUSHAF_REHAL_DATA_URI,
  ORNAMENT_DIAMOND,
} from './islamic-assets.ts'
import type { createQuranAppearanceRowStore, QuranThemePreference } from './settings-store.ts'
import css from './QuranAppearanceRow.module.css'

/** Injected business face: switches the theme preference. */
export interface QuranAppearanceRowInjected {
  /** Switch the theme preference (`mushaf`, `mushaf-dark`, `light`, `dark`, or `system`). */
  setTheme: (id: QuranThemePreference) => void
}

/** Full component props: runtime share + store share + injected face. */
export type QuranAppearanceRowComponentProps =
  PropsRuntime<'settings.general.item'> &
  PropsStore<ReturnType<typeof createQuranAppearanceRowStore>> &
  QuranAppearanceRowInjected

interface ThemeCubeSpec {
  id: QuranThemePreference
  labelAr: string
  labelEn: string
  Icon: typeof IconLightOutlineMedium
  swatches?: readonly [string, string, string]
  isMushaf?: boolean
  isDarkMushaf?: boolean
}

const CUBES: readonly ThemeCubeSpec[] = [
  {
    id: 'mushaf',
    labelAr: 'مصحف نهاري',
    labelEn: 'Mushaf Light',
    Icon: IconLightOutlineMedium,
    swatches: ['#FBF7EC', '#14663F', '#C9A44C'],
    isMushaf: true,
    isDarkMushaf: false,
  },
  {
    id: 'mushaf-dark',
    labelAr: 'مصحف ليلي',
    labelEn: 'Mushaf Dark',
    Icon: IconDarkOutlineMedium,
    swatches: ['#0E1B16', '#D4AF37', '#1C8A57'],
    isMushaf: true,
    isDarkMushaf: true,
  },
  {
    id: 'light',
    labelAr: 'فاتح',
    labelEn: 'Light',
    Icon: IconLightOutlineMedium,
  },
  {
    id: 'dark',
    labelAr: 'داكن',
    labelEn: 'Dark',
    Icon: IconDarkOutlineMedium,
  },
  {
    id: 'system',
    labelAr: 'تلقائي',
    labelEn: 'System',
    Icon: IconFollowsystemOutlineMedium,
  },
]

/**
 * Render the Quran Appearance settings row with all 5 themes, Mushaf-on-Rehal
 * emblem previews, and Islamic ornamental divider.
 */
export function QuranAppearanceRow({ setTheme, useStore }: QuranAppearanceRowComponentProps) {
  const preference = useStore(s => s.preference)
  return (
    <div className={css.group} data-testid="quran-appearance-row">
      <div className={css.header}>
        <div className={css.title}>المظهر · Appearance</div>
        <div className={css.subtitle}>الثيم الإسلامي والأنماط القياسية</div>
      </div>
      <div className={css.ornamentLine} aria-hidden="true">
        {ORNAMENT_DIAMOND}
      </div>
      <div className={css.cubeRow}>
        {CUBES.map(({ id, labelAr, labelEn, Icon, swatches, isMushaf, isDarkMushaf }) => {
          const isSelected = preference === id
          const className = [css.themeCube, isSelected ? css.selected : ''].filter(Boolean).join(' ')
          return (
            <button
              key={id}
              type="button"
              data-theme-id={id}
              className={className}
              aria-pressed={isSelected}
              onClick={() => { setTheme(id) }}
            >
              {isMushaf === true && (
                <div
                  className={`${css.cubePatternThumb} ${isDarkMushaf ? '' : css.cubePatternLight}`}
                  style={{ backgroundImage: `url("${ISLAMIC_PATTERN_DATA_URI}")` }}
                  aria-hidden="true"
                />
              )}
              <div className={css.iconRow}>
                {isMushaf === true ? (
                  <img
                    src={MUSHAF_REHAL_DATA_URI}
                    alt=""
                    className={`${css.mushafThumbIcon} ${isDarkMushaf ? css.mushafThumbIconDark : ''}`}
                  />
                ) : (
                  <Icon />
                )}
                {swatches !== undefined && (
                  <span className={css.swatchGroup} aria-hidden="true">
                    {swatches.map(color => (
                      <span
                        key={color}
                        className={css.swatchDot}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <span className={css.labelAr}>{labelAr}</span>
              <span className={css.labelEn}>{labelEn}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
