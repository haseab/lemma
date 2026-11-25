import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verticalTarget} from '../src/navigation.js';
const box=(left,top,width=10)=>({left,right:left+width,top,bottom:top+20,width,height:20});
test('vertical prose movement follows visual lines while preserving the horizontal column',()=>{
 const candidates=[{offset:1,before:0,rect:box(0,0)},{offset:2,before:1,rect:box(10,0)},{offset:3,before:2,rect:box(0,36)},{offset:4,before:3,rect:box(10,36)},{offset:5,before:4,rect:box(0,72)}];
 assert.equal(verticalTarget(candidates,box(10,0),1,20),4);
 assert.equal(verticalTarget(candidates,box(10,36),-1,20),2);
 assert.equal(verticalTarget(candidates,box(10,0),-1,20),null);
 assert.equal(verticalTarget(candidates,box(0,72),-1,1),2);
});
