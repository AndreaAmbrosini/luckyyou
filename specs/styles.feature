Feature: Styles come from the token file
  Colours, fonts and font sizes are set in one place, so the visual style can
  change in one place.

  Rule: CSS sets colours, fonts and font sizes only through var(--…)

    Scenario Outline: "<declaration>" is <verdict>
      When a stylesheet declares "<declaration>"
      Then Stylelint finds it <verdict>

      Examples:
        | declaration                 | verdict |
        | color: var(--color-text)    | fine    |
        | font-size: var(--size-body) | fine    |
        | fill: currentColor          | fine    |
        | color: red                  | wrong   |
        | background: #222            | wrong   |
        | border: 1px solid red       | wrong   |
        | font: 14px Arial            | wrong   |
