Feature: Docs stay short and plain
  People read these docs and agents load them, so every word costs.

  Rule: Each doc stays within its word budget

    Scenario Outline: <doc> stays within <budget> words
      Then <doc> has at most <budget> words

      Examples:
        | doc        | budget |
        | AGENTS.md  | 400    |
        | DESIGN.md  | 1000   |
        | PRODUCT.md | 250    |
        | README.md  | 400    |

    Scenario: Each decision record stays within 200 words
      Then every file in docs/decisions has at most 200 words

  Rule: Docs avoid stock phrases

    Scenario: No doc uses a banned phrase
      Then no doc contains any of these phrases:
        | phrase                      |
        | seamless                    |
        | robust                      |
        | leverage                    |
        | comprehensive               |
        | cutting-edge                |
        | best-in-class               |
        | delve                       |
        | it's worth noting           |
        | this file provides guidance |
        | in conclusion               |

  Rule: Links point somewhere

    Scenario: Every relative link resolves
      Then every relative link in the docs points to a file that exists

  Rule: CLAUDE.md only points to AGENTS.md

    Scenario: CLAUDE.md holds nothing but the import
      Then CLAUDE.md contains exactly "@AGENTS.md"
