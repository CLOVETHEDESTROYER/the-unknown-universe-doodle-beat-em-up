"""Pack generated jump sheets with a single scale per character."""
from pack_christmas_v1 import register

register('klause-flip-v4','killer-klause','flip-v4.png',4,2,640,
         {'flip': (list(range(8)), 19, 0)},target_height=420,centered=True)
for role in ('medic','engineer'):
    register('elf-'+role+'-jump-v2','elves',role+'-jump-v2.png',4,2,320,
             {'jump': (list(range(8)), 10, 0)},target_height=230,centered=True)
