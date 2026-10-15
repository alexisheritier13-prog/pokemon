-- Story 1.7 — initial catalog (applied to every environment, idempotent).
-- Product names are generic and descriptive; no official visuals (images are admin uploads, story 5.1).

create unique index if not exists products_game_name_uidx on public.products (game_id, name);

insert into public.games (slug, name) values ('pokemon', 'Pokémon')
on conflict (slug) do nothing;

-- osm_match: normalized patterns (lowercase, no accents) matched against OSM brand/name tags.
insert into public.brands (slug, name, kind, category_color, osm_match) values
  ('leclerc',         'E.Leclerc',            'hypermarket', 'eau',      array['leclerc']),
  ('carrefour',       'Carrefour',            'hypermarket', 'eau',      array['carrefour']),
  ('auchan',          'Auchan',               'hypermarket', 'feu',      array['auchan']),
  ('intermarche',     'Intermarché',          'supermarket', 'feu',      array['intermarche']),
  ('systeme-u',       'Super U / Hyper U',    'supermarket', 'eau',      array['super u', 'hyper u', 'systeme u']),
  ('geant-casino',    'Géant Casino',         'hypermarket', 'plante',   array['geant casino', 'geant']),
  ('cultura',         'Cultura',              'culture',     'psy',      array['cultura']),
  ('fnac',            'Fnac',                 'culture',     'psy',      array['fnac']),
  ('micromania',      'Micromania-Zing',      'video_games', 'electrik', array['micromania']),
  ('joueclub',        'JouéClub',             'toys',        'feu',      array['joueclub', 'joue club']),
  ('king-jouet',      'King Jouet',           'toys',        'feu',      array['king jouet']),
  ('la-grande-recre', 'La Grande Récré',      'toys',        'feu',      array['la grande recre', 'grande recre']),
  ('picwic',          'Picwic Toys',          'toys',        'feu',      array['picwic']),
  ('maxi-toys',       'Maxi Toys',            'toys',        'feu',      array['maxi toys']),
  ('toys-r-us',       'Toys"R"Us',            'toys',        'feu',      array['toys r us', 'toysrus']),
  ('action',          'Action',               'other',       'roche',    array['action']),
  ('independant',     'Boutique indépendante','tcg_shop',    'plante',   array[]::text[])
on conflict (slug) do nothing;

insert into public.products (game_id, name, type, sort_order)
select g.id, p.name, p.type::public.product_type, p.sort_order
from public.games g
cross join (values
  ('Booster',                                  'booster',  10),
  ('Display 36 boosters',                      'display',  20),
  ('Demi-display 18 boosters',                 'display',  25),
  ('Coffret Dresseur d’Élite (ETB)',           'etb',      30),
  ('Tripack (3 boosters sous blister)',        'blister',  40),
  ('Blister 1 booster + carte promo',          'blister',  45),
  ('Bundle 6 boosters',                        'bundle',   50),
  ('Coffret collection',                       'coffret',  60),
  ('Coffret premium',                          'coffret',  65),
  ('Coffret ultra-premium',                    'coffret',  70),
  ('Tin (boîte métal)',                        'tin',      80),
  ('Mini-tin',                                 'tin',      85),
  ('Deck de combat',                           'other',    90),
  ('Calendrier de l’Avent',                    'other',    95),
  ('Autre produit',                            'other',   999)
) as p(name, type, sort_order)
where g.slug = 'pokemon'
on conflict (game_id, name) do nothing;
