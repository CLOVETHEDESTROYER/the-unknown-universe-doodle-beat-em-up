import React from 'react';
import {SHOP_ITEMS,type BuddyId} from '../gameplay/shopCatalog';
import {kaiPosterPath} from '../gameplay/kaiWorkshopArt';
import type {Wallet} from '../gameplay/levelRewards';
import './BuddyPicker.css';

export default function BuddyPicker({wallet,onChoose,error='',shop=false}:{wallet:Wallet;onChoose:(id:BuddyId|'classic')=>void;error?:string;shop?:boolean}){
  const buddies=SHOP_ITEMS.filter(item=>item.type==='buddy');
  return <section className="buddy-picker" aria-label="Choose a buddy"><header><h2>{shop?'Meet your buddies':'Bring a buddy'}</h2><p>{shop?'Discover buddies in crates. Owned buddies can be equipped here or before a run.':'Choose one owned buddy, then pick your hero. Your choice is saved.'}</p></header>
    <div className="buddy-picker-grid"><button type="button" aria-label="Choose no buddy" aria-pressed={wallet.equipped.buddy==='classic'} onClick={()=>onChoose('classic')}><span className="buddy-none">✧</span><strong>No buddy</strong><small>Go solo</small></button>{buddies.map(item=>{const owned=wallet.owned.includes(item.id);return <button key={item.id} type="button" disabled={!owned} aria-label={`Choose ${item.name}`} aria-pressed={wallet.equipped.buddy===item.id} onClick={()=>onChoose(item.id)}><img src={kaiPosterPath(item.id)} width={72} height={72} alt=""/><strong>{item.name}</strong><small>{owned?wallet.equipped.buddy===item.id?'Selected':'Owned':`${item.price<=400?'Rare':'Epic'} · Find in crates`}</small></button>;})}</div>
    <p className="buddy-picker-help">{buddies.find(item=>item.id===wallet.equipped.buddy)?.description??'Buddies stay with you and help automatically.'}</p>{error&&<p role="alert">{error}</p>}
  </section>;
}
