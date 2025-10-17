import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Phone, MapPin, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "Thank you for contacting us. We'll get back to you soon.",
    });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-light/10 dark:via-background dark:to-secondary-light/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient-shift">
              Get In Touch
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>
      
      {/* Contact Content */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div className="bg-card p-8 rounded-2xl border border-border/40 shadow-card">
              <h2 className="text-3xl font-bold mb-6 text-foreground">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    type="text"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                    className="mt-2 min-h-[150px]"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-glow"
                  size="lg"
                >
                  Send Message
                </Button>
              </form>
            </div>
            
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-foreground">Contact Information</h2>
                <p className="text-muted-foreground mb-8">
                  Get in touch with us through any of these channels. We're here to help you with any questions or concerns.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Phone</h3>
                    <p className="text-muted-foreground">+254 725 999 285</p>
                    <p className="text-sm text-muted-foreground mt-1">Mon-Fri 8am-6pm EAT</p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-lg bg-secondary/10">
                      <Mail className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Email</h3>
                    <p className="text-muted-foreground">info@telivus.co.ke</p>
                    <p className="text-sm text-muted-foreground mt-1">We'll respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Office Location</h3>
                    <p className="text-muted-foreground">
                      Kenrail Towers, Westlands<br />
                      P.O. Box 34209-00100<br />
                      Nairobi, Kenya
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="p-3 rounded-lg bg-secondary/10">
                      <Clock className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-foreground">Business Hours</h3>
                    <p className="text-muted-foreground">
                      Monday - Friday: 8:00 AM - 6:00 PM<br />
                      Saturday: 9:00 AM - 2:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Contact;