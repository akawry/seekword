from google.appengine.ext import db
from django.utils import simplejson

class Level(db.Model):
    grid = db.StringProperty()
    word_bank = db.StringListProperty()
    time = db.DateTimeProperty(auto_now = True)
    
    def to_xml(self):
        buff = "<response>"
        buff += "<grid>" + self.grid + "</grid>"
        buff += "<word_bank>"
        for word in self.word_bank:
            buff += "<word>" + word + "</word>"
        buff += "</word_bank>"
        buff += "<time>" + str(self.time.utcnow()) + "</time>"
        buff += "</response>"
        return buff
    
    def to_json(self):
        obj = {"grid": self.grid,
               "word_bank" : self.word_bank,
               "time" : str(self.time.utcnow())}
        return simplejson.dumps(obj)