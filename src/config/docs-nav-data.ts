/**
 * Docs navigation + redirects (TypeScript twin of the relevant docs/docs.json sections).
 *
 * The full docs.json cannot be imported by the Vercel Edge Middleware bundler,
 * so this module inlines the navigation and redirects sections that
 * docs-root-redirects.ts needs. Regenerate from docs/docs.json if it changes.
 */
export const docsNavData = {
  "navigation": {
    "languages": [
      {
        "language": "en",
        "tabs": [
          {
            "tab": "Documentation",
            "groups": [
              {
                "group": "Getting Started",
                "pages": [
                  "documentation",
                  "getting-started",
                  "architecture"
                ]
              },
              {
                "group": "Usage",
                "pages": [
                  "usage-quickstart",
                  "usage-auth",
                  "usage-rate-limits",
                  "usage-errors",
                  "sandbox",
                  "pricing",
                  "accounts",
                  "api-keys",
                  "support"
                ]
              },
              {
                "group": "Platform & Features",
                "pages": [
                  "overview",
                  "features",
                  "pro-intelligence-suite",
                  "data-sources",
                  "global-procurement-intelligence",
                  "hotspots"
                ]
              },
              {
                "group": "Intelligence & Analysis",
                "pages": [
                  "signal-intelligence",
                  "ai-intelligence",
                  "china-data-coverage",
                  "china-official-macro-policy",
                  "china-corporate-disclosures",
                  "china-logistics-corridors",
                  "methodology/china-activity-nowcast",
                  "methodology/news-digest-and-briefing",
                  "methodology/news-credibility",
                  "country-instability-index",
                  "methodology/country-resilience-index",
                  "methodology/resilience-indicators",
                  "methodology/resilience-indicator-licensing",
                  "methodology/known-limitations",
                  "methodology/financial-system-exposure",
                  "methodology/swf-classification-rubric",
                  "methodology/five-factor-scorecard",
                  "methodology/demographics-capability",
                  "methodology/food-stocks",
                  "methodology/defense-industrial-base",
                  "methodology/mineral-production",
                  "methodology/supply-vulnerability",
                  "methodology/chokepoints",
                  "methodology/pipelines",
                  "methodology/storage",
                  "methodology/shortages",
                  "methodology/disruptions",
                  "methodology/cii-risk-scores",
                  "methodology/disease-alert-level",
                  "methodology/thermal-escalation",
                  "methodology/physical-divergence-index",
                  "corrections",
                  "geographic-convergence",
                  "strategic-risk",
                  "algorithms"
                ]
              },
              {
                "group": "Workflows",
                "pages": [
                  "embed-live-map",
                  "route-explorer",
                  "scenario-engine"
                ]
              },
              {
                "group": "Map Layers",
                "pages": [
                  "map-engine",
                  "orbital-surveillance",
                  "military-tracking",
                  "maritime-intelligence",
                  "natural-disasters",
                  "infrastructure-cascade",
                  "maps-and-geocoding",
                  "webcam-layer"
                ]
              },
              {
                "group": "Finance",
                "pages": [
                  "finance-data",
                  "premium-finance",
                  "premium-finance-search"
                ]
              },
              {
                "group": "Panels \u2014 AI & PRO",
                "pages": [
                  "panels/latest-brief",
                  "panels/forecast",
                  "panels/chat-analyst",
                  "panels/market-implications",
                  "panels/deduction",
                  "panels/daily-market-brief",
                  "panels/regional-intelligence",
                  "panels/strategic-posture",
                  "panels/threat-timeline",
                  "panels/stock-analysis",
                  "panels/stock-backtest",
                  "panels/wsb-ticker-scanner"
                ]
              },
              {
                "group": "Panels \u2014 Data & Tracking",
                "pages": [
                  "panels/consumer-prices",
                  "panels/disease-outbreaks",
                  "panels/radiation-watch",
                  "panels/thermal-escalation",
                  "panels/airline-intel",
                  "panels/tech-readiness",
                  "panels/trade-policy",
                  "panels/supply-chain",
                  "panels/sanctions-pressure",
                  "panels/hormuz-tracker",
                  "panels/energy-crisis",
                  "panels/world-clock",
                  "panels/monitors",
                  "panels/oref-sirens",
                  "panels/telegram-intel",
                  "panels/x-intel",
                  "panels/fsi"
                ]
              },
              {
                "group": "Panels \u2014 Catalogues",
                "pages": [
                  "panels/news-feeds",
                  "panels/indicators-and-signals"
                ]
              },
              {
                "group": "Desktop Application",
                "pages": [
                  "desktop-app"
                ]
              },
              {
                "group": "MCP & Integrations",
                "pages": [
                  "agent-discovery",
                  "agent-skills",
                  "mcp-quickstart",
                  "cli",
                  "sdks",
                  "mcp-overview",
                  "webmcp",
                  "mcp-apps",
                  "mcp-tools-reference",
                  "mcp-jmespath",
                  "mcp-error-catalog",
                  "api-oauth",
                  "api-notifications"
                ]
              },
              {
                "group": "HTTP API",
                "pages": [
                  "api-platform",
                  "api-brief",
                  "api-commerce",
                  "api-scenarios",
                  "api-shipping-v2",
                  "api-proxies"
                ]
              },
              {
                "group": "Developer Guide",
                "pages": [
                  "contributing",
                  "authentication",
                  "adding-endpoints",
                  "webmcp-maintenance",
                  "api-key-deployment",
                  "releasing-cli",
                  "release-packaging",
                  "cors",
                  "health-endpoints",
                  "relay-parameters",
                  "decision-signal-provenance",
                  "china-decision-signals",
                  "source-attribution"
                ]
              },
              {
                "group": "Company",
                "pages": [
                  "about"
                ]
              },
              {
                "group": "Legal",
                "pages": [
                  "eula",
                  "terms",
                  "dpa",
                  "license",
                  "trademark-policy",
                  "privacy"
                ]
              }
            ]
          },
          {
            "tab": "API Reference",
            "openapi": "api/worldmonitor.openapi.yaml",
            "groups": [
              {
                "group": "Overview",
                "pages": [
                  "api-reference",
                  "api-versioning"
                ]
              },
              {
                "group": "Geopolitical",
                "pages": [
                  {
                    "group": "Conflicts",
                    "openapi": "api/ConflictService.openapi.yaml"
                  },
                  {
                    "group": "Military",
                    "openapi": "api/MilitaryService.openapi.yaml"
                  },
                  {
                    "group": "Unrest",
                    "openapi": "api/UnrestService.openapi.yaml"
                  },
                  {
                    "group": "Intelligence",
                    "openapi": "api/IntelligenceService.openapi.yaml"
                  },
                  {
                    "group": "Displacement",
                    "openapi": "api/DisplacementService.openapi.yaml"
                  },
                  {
                    "group": "Cyber",
                    "openapi": "api/CyberService.openapi.yaml"
                  },
                  {
                    "group": "Sanctions",
                    "openapi": "api/SanctionsService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "Natural Events",
                "pages": [
                  {
                    "group": "Natural Disasters",
                    "openapi": "api/NaturalService.openapi.yaml"
                  },
                  {
                    "group": "Seismology",
                    "openapi": "api/SeismologyService.openapi.yaml"
                  },
                  {
                    "group": "Climate",
                    "openapi": "api/ClimateService.openapi.yaml"
                  },
                  {
                    "group": "Wildfires",
                    "openapi": "api/WildfireService.openapi.yaml"
                  },
                  {
                    "group": "Radiation",
                    "openapi": "api/RadiationService.openapi.yaml"
                  },
                  {
                    "group": "Thermal",
                    "openapi": "api/ThermalService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "Economy & Markets",
                "pages": [
                  {
                    "group": "Economic",
                    "openapi": "api/EconomicService.openapi.yaml"
                  },
                  {
                    "group": "Markets",
                    "openapi": "api/MarketService.openapi.yaml"
                  },
                  {
                    "group": "Trade",
                    "openapi": "api/TradeService.openapi.yaml"
                  },
                  {
                    "group": "Supply Chain",
                    "openapi": "api/SupplyChainService.openapi.yaml"
                  },
                  {
                    "group": "Consumer Prices",
                    "openapi": "api/ConsumerPricesService.openapi.yaml"
                  },
                  {
                    "group": "Predictions",
                    "openapi": "api/PredictionService.openapi.yaml"
                  },
                  {
                    "group": "Forecasts",
                    "openapi": "api/ForecastService.openapi.yaml"
                  },
                  {
                    "group": "Commerce",
                    "openapi": "openapi/CommerceService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "Infrastructure & Transport",
                "pages": [
                  {
                    "group": "Aviation",
                    "openapi": "api/AviationService.openapi.yaml"
                  },
                  {
                    "group": "Maritime",
                    "openapi": "api/MaritimeService.openapi.yaml"
                  },
                  {
                    "group": "Infrastructure",
                    "openapi": "api/InfrastructureService.openapi.yaml"
                  },
                  {
                    "group": "Resilience",
                    "openapi": "api/ResilienceService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "Health & Environment",
                "pages": [
                  {
                    "group": "Public Health",
                    "openapi": "api/HealthService.openapi.yaml"
                  },
                  {
                    "group": "Imagery",
                    "openapi": "api/ImageryService.openapi.yaml"
                  },
                  {
                    "group": "Webcams",
                    "openapi": "api/WebcamService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "Other",
                "pages": [
                  {
                    "group": "News",
                    "openapi": "api/NewsService.openapi.yaml"
                  },
                  {
                    "group": "Research",
                    "openapi": "api/ResearchService.openapi.yaml"
                  },
                  {
                    "group": "Positive Events",
                    "openapi": "api/PositiveEventsService.openapi.yaml"
                  },
                  {
                    "group": "Giving",
                    "openapi": "api/GivingService.openapi.yaml"
                  },
                  {
                    "group": "Batch",
                    "openapi": "api/BatchService.openapi.yaml"
                  }
                ]
              }
            ]
          },
          {
            "tab": "Changelog",
            "groups": [
              {
                "group": "Changelog",
                "pages": [
                  "changelog"
                ]
              }
            ]
          }
        ]
      },
      {
        "language": "zh",
        "navbar": {
          "links": [
            {
              "label": "\u535a\u5ba2",
              "href": "https://www.worldmonitor.app/blog"
            },
            {
              "label": "\u4eea\u8868\u76d8",
              "href": "https://www.worldmonitor.app"
            },
            {
              "label": "Pro",
              "href": "https://www.worldmonitor.app/pro"
            },
            {
              "label": "GitHub",
              "href": "https://github.com/koala73/worldmonitor"
            }
          ],
          "primary": {
            "type": "button",
            "label": "\u67e5\u770b Pro \u65b9\u6848",
            "href": "https://www.worldmonitor.app/pro#pricing"
          }
        },
        "footer": {
          "socials": {
            "github": "https://github.com/koala73/worldmonitor",
            "x": "https://x.com/worldmonitorai"
          },
          "links": [
            {
              "header": "World Monitor",
              "items": [
                {
                  "label": "\u4eea\u8868\u76d8",
                  "href": "https://www.worldmonitor.app"
                },
                {
                  "label": "Pro",
                  "href": "https://www.worldmonitor.app/pro"
                },
                {
                  "label": "\u535a\u5ba2",
                  "href": "https://www.worldmonitor.app/blog"
                }
              ]
            },
            {
              "header": "\u793e\u533a",
              "items": [
                {
                  "label": "GitHub",
                  "href": "https://github.com/koala73/worldmonitor"
                },
                {
                  "label": "X",
                  "href": "https://x.com/worldmonitorai"
                },
                {
                  "label": "\u72b6\u6001",
                  "href": "https://status.worldmonitor.app/"
                }
              ]
            }
          ]
        },
        "tabs": [
          {
            "tab": "\u6587\u6863",
            "groups": [
              {
                "group": "\u5165\u95e8",
                "pages": [
                  "zh/documentation",
                  "zh/getting-started",
                  "zh/architecture"
                ]
              },
              {
                "group": "\u4f7f\u7528",
                "pages": [
                  "zh/usage-quickstart",
                  "zh/usage-auth",
                  "zh/usage-rate-limits",
                  "zh/usage-errors",
                  "zh/sandbox",
                  "zh/pricing",
                  "zh/accounts",
                  "zh/api-keys",
                  "zh/support"
                ]
              },
              {
                "group": "\u5e73\u53f0\u4e0e\u529f\u80fd",
                "pages": [
                  "zh/overview",
                  "zh/features",
                  "zh/pro-intelligence-suite",
                  "zh/data-sources",
                  "zh/global-procurement-intelligence",
                  "zh/hotspots"
                ]
              },
              {
                "group": "\u60c5\u62a5\u4e0e\u5206\u6790",
                "pages": [
                  "zh/signal-intelligence",
                  "zh/ai-intelligence",
                  "zh/china-data-coverage",
                  "zh/china-official-macro-policy",
                  "zh/china-corporate-disclosures",
                  "zh/china-logistics-corridors",
                  "zh/methodology/china-activity-nowcast",
                  "zh/methodology/news-digest-and-briefing",
                  "zh/methodology/news-credibility",
                  "zh/country-instability-index",
                  "zh/methodology/country-resilience-index",
                  "zh/methodology/resilience-indicators",
                  "zh/methodology/resilience-indicator-licensing",
                  "zh/methodology/five-factor-scorecard",
                  "zh/methodology/demographics-capability",
                  "zh/methodology/food-stocks",
                  "zh/methodology/defense-industrial-base",
                  "zh/methodology/mineral-production",
                  "zh/methodology/supply-vulnerability",
                  "zh/methodology/chokepoints",
                  "zh/methodology/pipelines",
                  "zh/methodology/storage",
                  "zh/methodology/shortages",
                  "zh/methodology/disruptions",
                  "zh/methodology/cii-risk-scores",
                  "zh/methodology/disease-alert-level",
                  "zh/methodology/thermal-escalation",
                  "zh/methodology/physical-divergence-index",
                  "zh/corrections",
                  "zh/geographic-convergence",
                  "zh/strategic-risk",
                  "zh/algorithms"
                ]
              },
              {
                "group": "\u5de5\u4f5c\u6d41",
                "pages": [
                  "zh/embed-live-map",
                  "zh/route-explorer",
                  "zh/scenario-engine"
                ]
              },
              {
                "group": "\u5730\u56fe\u56fe\u5c42",
                "pages": [
                  "zh/map-engine",
                  "zh/orbital-surveillance",
                  "zh/military-tracking",
                  "zh/maritime-intelligence",
                  "zh/natural-disasters",
                  "zh/infrastructure-cascade",
                  "zh/maps-and-geocoding",
                  "zh/webcam-layer"
                ]
              },
              {
                "group": "\u91d1\u878d",
                "pages": [
                  "zh/finance-data",
                  "zh/premium-finance",
                  "zh/premium-finance-search"
                ]
              },
              {
                "group": "\u9762\u677f \u2014 AI \u4e0e PRO",
                "pages": [
                  "zh/panels/latest-brief",
                  "zh/panels/forecast",
                  "zh/panels/chat-analyst",
                  "zh/panels/market-implications",
                  "zh/panels/deduction",
                  "zh/panels/daily-market-brief",
                  "zh/panels/regional-intelligence",
                  "zh/panels/strategic-posture",
                  "zh/panels/threat-timeline",
                  "zh/panels/stock-analysis",
                  "zh/panels/stock-backtest",
                  "zh/panels/wsb-ticker-scanner"
                ]
              },
              {
                "group": "\u9762\u677f \u2014 \u6570\u636e\u4e0e\u8ffd\u8e2a",
                "pages": [
                  "zh/panels/consumer-prices",
                  "zh/panels/disease-outbreaks",
                  "zh/panels/radiation-watch",
                  "zh/panels/thermal-escalation",
                  "zh/panels/airline-intel",
                  "zh/panels/tech-readiness",
                  "zh/panels/trade-policy",
                  "zh/panels/supply-chain",
                  "zh/panels/sanctions-pressure",
                  "zh/panels/hormuz-tracker",
                  "zh/panels/energy-crisis",
                  "zh/panels/world-clock",
                  "zh/panels/monitors",
                  "zh/panels/oref-sirens",
                  "zh/panels/telegram-intel",
                  "zh/panels/x-intel",
                  "zh/panels/fsi"
                ]
              },
              {
                "group": "\u9762\u677f \u2014 \u76ee\u5f55",
                "pages": [
                  "zh/panels/news-feeds",
                  "zh/panels/indicators-and-signals"
                ]
              },
              {
                "group": "\u684c\u9762\u5e94\u7528",
                "pages": [
                  "zh/desktop-app"
                ]
              },
              {
                "group": "MCP \u4e0e\u96c6\u6210",
                "pages": [
                  "zh/agent-discovery",
                  "zh/agent-skills",
                  "zh/mcp-quickstart",
                  "zh/cli",
                  "zh/sdks",
                  "zh/mcp-overview",
                  "zh/webmcp",
                  "zh/mcp-apps",
                  "zh/mcp-tools-reference",
                  "zh/mcp-jmespath",
                  "zh/mcp-error-catalog",
                  "zh/api-oauth",
                  "zh/api-notifications"
                ]
              },
              {
                "group": "HTTP API",
                "pages": [
                  "zh/api-platform",
                  "zh/api-brief",
                  "zh/api-commerce",
                  "zh/api-scenarios",
                  "zh/api-shipping-v2",
                  "zh/api-proxies"
                ]
              },
              {
                "group": "\u5f00\u53d1\u8005\u6307\u5357",
                "pages": [
                  "zh/contributing",
                  "zh/authentication",
                  "zh/adding-endpoints",
                  "zh/webmcp-maintenance",
                  "zh/api-key-deployment",
                  "zh/releasing-cli",
                  "zh/release-packaging",
                  "zh/cors",
                  "zh/health-endpoints",
                  "zh/relay-parameters",
                  "zh/decision-signal-provenance",
                  "zh/china-decision-signals",
                  "zh/source-attribution"
                ]
              },
              {
                "group": "\u516c\u53f8",
                "pages": [
                  "zh/about"
                ]
              },
              {
                "group": "\u6cd5\u5f8b",
                "pages": [
                  "zh/eula",
                  "zh/terms",
                  "zh/dpa",
                  "zh/license",
                  "zh/trademark-policy",
                  "zh/privacy"
                ]
              }
            ]
          },
          {
            "tab": "API \u53c2\u8003",
            "openapi": "api/worldmonitor.openapi.yaml",
            "groups": [
              {
                "group": "\u6982\u89c8",
                "pages": [
                  "zh/api-reference",
                  "zh/api-versioning"
                ]
              },
              {
                "group": "\u5730\u7f18\u653f\u6cbb",
                "pages": [
                  {
                    "group": "\u51b2\u7a81",
                    "openapi": "api/ConflictService.openapi.yaml"
                  },
                  {
                    "group": "\u519b\u4e8b",
                    "openapi": "api/MilitaryService.openapi.yaml"
                  },
                  {
                    "group": "\u52a8\u4e71",
                    "openapi": "api/UnrestService.openapi.yaml"
                  },
                  {
                    "group": "\u60c5\u62a5",
                    "openapi": "api/IntelligenceService.openapi.yaml"
                  },
                  {
                    "group": "\u6d41\u79bb\u5931\u6240",
                    "openapi": "api/DisplacementService.openapi.yaml"
                  },
                  {
                    "group": "\u7f51\u7edc",
                    "openapi": "api/CyberService.openapi.yaml"
                  },
                  {
                    "group": "\u5236\u88c1",
                    "openapi": "api/SanctionsService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "\u81ea\u7136\u4e8b\u4ef6",
                "pages": [
                  {
                    "group": "\u81ea\u7136\u707e\u5bb3",
                    "openapi": "api/NaturalService.openapi.yaml"
                  },
                  {
                    "group": "\u5730\u9707\u5b66",
                    "openapi": "api/SeismologyService.openapi.yaml"
                  },
                  {
                    "group": "\u6c14\u5019",
                    "openapi": "api/ClimateService.openapi.yaml"
                  },
                  {
                    "group": "\u91ce\u706b",
                    "openapi": "api/WildfireService.openapi.yaml"
                  },
                  {
                    "group": "\u8f90\u5c04",
                    "openapi": "api/RadiationService.openapi.yaml"
                  },
                  {
                    "group": "\u70ed\u529b",
                    "openapi": "api/ThermalService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "\u7ecf\u6d4e\u4e0e\u5e02\u573a",
                "pages": [
                  {
                    "group": "\u7ecf\u6d4e",
                    "openapi": "api/EconomicService.openapi.yaml"
                  },
                  {
                    "group": "\u5e02\u573a",
                    "openapi": "api/MarketService.openapi.yaml"
                  },
                  {
                    "group": "\u8d38\u6613",
                    "openapi": "api/TradeService.openapi.yaml"
                  },
                  {
                    "group": "\u4f9b\u5e94\u94fe",
                    "openapi": "api/SupplyChainService.openapi.yaml"
                  },
                  {
                    "group": "\u6d88\u8d39\u8005\u4ef7\u683c",
                    "openapi": "api/ConsumerPricesService.openapi.yaml"
                  },
                  {
                    "group": "\u9884\u6d4b",
                    "openapi": "api/PredictionService.openapi.yaml"
                  },
                  {
                    "group": "\u9884\u62a5",
                    "openapi": "api/ForecastService.openapi.yaml"
                  },
                  {
                    "group": "\u5546\u4e1a",
                    "openapi": "openapi/CommerceService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "\u57fa\u7840\u8bbe\u65bd\u4e0e\u4ea4\u901a",
                "pages": [
                  {
                    "group": "\u822a\u7a7a",
                    "openapi": "api/AviationService.openapi.yaml"
                  },
                  {
                    "group": "\u6d77\u4e8b",
                    "openapi": "api/MaritimeService.openapi.yaml"
                  },
                  {
                    "group": "\u57fa\u7840\u8bbe\u65bd",
                    "openapi": "api/InfrastructureService.openapi.yaml"
                  },
                  {
                    "group": "\u97e7\u6027",
                    "openapi": "api/ResilienceService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "\u5065\u5eb7\u4e0e\u73af\u5883",
                "pages": [
                  {
                    "group": "\u516c\u5171\u536b\u751f",
                    "openapi": "api/HealthService.openapi.yaml"
                  },
                  {
                    "group": "\u5f71\u50cf",
                    "openapi": "api/ImageryService.openapi.yaml"
                  },
                  {
                    "group": "\u7f51\u7edc\u6444\u50cf\u5934",
                    "openapi": "api/WebcamService.openapi.yaml"
                  }
                ]
              },
              {
                "group": "\u5176\u4ed6",
                "pages": [
                  {
                    "group": "\u65b0\u95fb",
                    "openapi": "api/NewsService.openapi.yaml"
                  },
                  {
                    "group": "\u7814\u7a76",
                    "openapi": "api/ResearchService.openapi.yaml"
                  },
                  {
                    "group": "\u6b63\u9762\u4e8b\u4ef6",
                    "openapi": "api/PositiveEventsService.openapi.yaml"
                  },
                  {
                    "group": "\u6350\u8d60",
                    "openapi": "api/GivingService.openapi.yaml"
                  },
                  {
                    "group": "\u6279\u91cf",
                    "openapi": "api/BatchService.openapi.yaml"
                  }
                ]
              }
            ]
          },
          {
            "tab": "\u66f4\u65b0\u65e5\u5fd7",
            "groups": [
              {
                "group": "\u66f4\u65b0\u65e5\u5fd7",
                "pages": [
                  "zh/changelog"
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "redirects": [
    {
      "source": "/mcp-server",
      "destination": "/mcp-overview"
    },
    {
      "source": "/plans",
      "destination": "/pricing"
    },
    {
      "source": "/tiers",
      "destination": "/pricing"
    },
    {
      "source": "/rate-limit",
      "destination": "/usage-rate-limits"
    },
    {
      "source": "/rate-limits",
      "destination": "/usage-rate-limits"
    },
    {
      "source": "/mcp-api-key",
      "destination": "/usage-auth"
    },
    {
      "source": "/contact",
      "destination": "/support"
    }
  ]
};
export default docsNavData;
