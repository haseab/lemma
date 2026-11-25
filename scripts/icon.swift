import AppKit
let size = NSSize(width:1024,height:1024)
let image = NSImage(size:size)
image.lockFocus()
let frame = NSRect(x:32,y:32,width:960,height:960)
NSColor(calibratedRed:0.92,green:0.94,blue:0.88,alpha:1).setFill()
NSBezierPath(roundedRect:frame,xRadius:214,yRadius:214).fill()
NSColor(calibratedRed:0.99,green:0.99,blue:0.97,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:164,y:122,width:696,height:780),xRadius:72,yRadius:72).fill()
let style = NSMutableParagraphStyle(); style.alignment = .center
let attrs: [NSAttributedString.Key:Any] = [.font:NSFont(name:"Georgia-Italic",size:530) ?? NSFont.systemFont(ofSize:530),.foregroundColor:NSColor(calibratedRed:0.24,green:0.38,blue:0.27,alpha:1),.paragraphStyle:style]
("λ" as NSString).draw(in:NSRect(x:150,y:200,width:724,height:650),withAttributes:attrs)
NSColor(calibratedRed:0.66,green:0.75,blue:0.58,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:302,y:220,width:420,height:12),xRadius:6,yRadius:6).fill()
image.unlockFocus()
let bitmap=NSBitmapImageRep(data:image.tiffRepresentation!)!
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
