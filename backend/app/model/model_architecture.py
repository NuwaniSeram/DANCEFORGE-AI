import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

class SimpleDanceStyleTransformer(keras.Model):
    def __init__(self, num_styles=3, latent_dim=64, **kwargs):
        super(SimpleDanceStyleTransformer, self).__init__(**kwargs)
        self.num_styles = num_styles
        self.latent_dim = latent_dim
        
        self.encoder = keras.Sequential([
            layers.LSTM(128, return_sequences=True),
            layers.Dropout(0.3),
            layers.LSTM(latent_dim, return_sequences=True),
        ], name='encoder')
        
        self.style_embedding = layers.Embedding(num_styles, latent_dim, name='style_embedding')
        self.style_dense = layers.Dense(latent_dim, activation='relu', name='style_dense')
        
        self.decoder = keras.Sequential([
            layers.LSTM(128, return_sequences=True),
            layers.Dropout(0.3),
            layers.TimeDistributed(layers.Dense(99))
        ], name='decoder')
    
    def call(self, inputs, target_style, training=False):
        batch_size = tf.shape(inputs)[0]
        seq_length = tf.shape(inputs)[1]
        
        content = self.encoder(inputs, training=training)
        style_embed = self.style_embedding(target_style)
        style_embed = self.style_dense(style_embed)
        style_embed = tf.expand_dims(style_embed, 1)
        style_embed = tf.tile(style_embed, [1, seq_length, 1])
        combined = content + style_embed
        output = self.decoder(combined, training=training)
        return output
